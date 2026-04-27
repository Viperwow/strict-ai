# pipeline — `log-work`

Detailed per-phase execution flow for the `log-work` skill. Each phase maps
directly to the summary in `SKILL.md §Pipeline overview`. Read this document
when you need to implement or audit the exact decision points, prompt text,
fallback branches, or idempotency obligations at each step.

---

## Phase 0 — Resolve context

### 0.1 Capture `now` (Single `now` rule)

```
now = utc_now()   # called exactly once — reused for all subsequent steps
```

`now` drives:
- Age math for the 30-day country-cache TTL (step 0.3).
- Cache-bucket selection for the holiday disk-cache filename.
- The `Generated:` trailing line in Phase 3.

Calling `Date.now()` / `time.time()` / `DateTime.UtcNow` more than once per
run MUST NOT happen (Single `now` rule from `idempotency.md`).

---

### 0.2 Resolve `project`

Resolution order:

```
CLI arg `project=KEY`
  └─ memory key `jira:last-project`
       └─ interactive prompt: "Project key? "
```

- If the CLI arg is present, use it for this run; do NOT persist to memory yet
  (persistence happens in Phase 3 on a successful run).
- If the memory key `jira:last-project` holds a value, use it; skip the prompt.
- If memory is empty, prompt the user:
  ```
  Project key? >
  ```
- On first successful run completion, write the resolved key to memory
  `jira:last-project`.

---

### 0.3 Resolve `country`

Resolution order:

```
CLI arg `country=XX`
  └─ memory key `jira:log-time:country`
       (reuse only if set within 30 days AND redetect=false)
       └─ location connector probe chain (declared order):
            1. os-region
            2. locale-env
            3. tz-country table
            4. user prompt: "Country code (ISO-3166-1 alpha-2)? "
```

- The memory key `jira:log-time:country` is valid when
  `now - memory_timestamp <= 30 days` AND `redetect=false`.
- When the location connector is invoked, probe layers in declared order and
  stop at the first layer that returns a value.
- Record the winning probe layer in memory key
  `jira:log-time:country-detected-by` (e.g. `"os-region"`).
- A CLI `country=XX` arg overrides everything for this run but does NOT update
  the memory cache.

---

### 0.4 Load and merge config

1. Attempt to load `${CLAUDE_PLUGIN_DATA}/log-work.json`.
2. If the file is **absent**, materialize the default config and write it
   atomically (Atomic writes rule from `idempotency.md`):
   ```
   write  log-work.json.tmp   # full default JSON content
   fsync  log-work.json.tmp
   rename log-work.json.tmp → log-work.json
   ```
3. Merge precedence (highest to lowest): CLI args → memory keys → config file
   → built-in defaults.
4. Config is **read-only** after first materialization. The skill MUST NOT
   rewrite `log-work.json` on subsequent runs unless the file is absent.

Resolved effective values after merge are used for all subsequent phases.
See `config-schema.md` for the full field list and permitted value ranges.

---

### 0.5 Probe connectors

Probe all connectors before entering Phase 1. Stop or degrade as noted:

| Connector | Required? | auth/network failure | unsupported failure |
|-----------|-----------|---------------------|---------------------|
| vacation-store | always | — (file-based; no auth) | **stop** — surface error and exit |
| jira | always | **stop** immediately | **stop** immediately |
| bamboohr | optional | **stop** immediately | degrade — proceed with vacation-store only; emit warning |
| tempo | per `sinks` config | **stop** immediately | fall through to jira-worklog sink |
| jira-worklog | per `sinks` config | **stop** immediately | **stop** immediately |

Probe order within each connector follows the connector's own `§Probe order`
section. Do NOT re-probe after Phase 0 completes.

---

## Phase 1 — Catch-up scan

Print phase header:
```
--- Phase 1 — Catch-up scan ---
```

### 1.1 Build working-day set

Enumerate all calendar dates in `[date - lookback, date]` inclusive. Remove:

1. **Weekends** — days not in the `workdays` config array (default: Mon–Fri).
2. **Public holidays** — dates returned by the holidays connector where
   `type=public`, for `(year, country)`. Only `type=public` entries are
   excluded; `type=bank` and `type=optional` are kept. Holiday data is
   disk-cached at:
   ```
   ${CLAUDE_PLUGIN_DATA}/holidays-{country}-{year}.json
   ```
   Written atomically (Atomic writes rule). If the holidays connector is
   unavailable at every probe layer, proceed without holiday filtering and
   emit:
   ```
   Warning: holidays unavailable for {country}-{year} — public holidays not excluded
   ```
3. **Vacation / sick / holiday entries** — dates covered by any entry in the
   vacation-store with `reason ∈ {vacation, sick, holiday}`. Entries with
   `reason=sick` are excluded in v1 alongside vacation and holiday entries.
4. **BambooHR time-off** — if BambooHR resolved to a reachable layer, merge
   its approved time-off records in-memory with the vacation-store entries
   before excluding dates. On BambooHR `unsupported`, skip and emit:
   ```
   Warning: BambooHR unavailable — using local vacation store only
   ```

The result is the **working-day set** for this run.

---

### 1.2 Query existing worklogs

For each day in the working-day set:
- Call `list_worklogs(author_email=currentUser, date=day)` on the jira
  connector.
- Compute `logged_minutes = sum(worklog.timeSpentSeconds / 60)`.

---

### 1.3 Classify days

| Class | Condition | Action |
|-------|-----------|--------|
| `full` | `logged_minutes >= 0.99 * target_minutes` | auto-skip; no user interaction |
| `partial` | `0 < logged_minutes < 0.99 * target_minutes` | include in selection table |
| `empty` | `logged_minutes == 0` | include in selection table |

---

### 1.4 Render selection table

Sort ascending by `date` string (ISO-8601, lexicographically stable — Stable
sort keys rule from `idempotency.md`). Absent logged values render as `—`
(em-dash, Missing-value sentinel rule from `idempotency.md`).

```
date        | logged   | target | delta  | status
----------- | -------- | ------ | ------ | -------
2026-04-21  | 0h       | 8h     | -8h    | empty
2026-04-22  | 3h 30m   | 8h     | -4h30m | partial
2026-04-24  | 8h       | 8h     | 0      | full (skipped)
```

Full days are shown for context but are not selectable.

---

### 1.5 Selection prompt

```
[a] Accept all non-full days  [p] Pick specific dates  [s] Skip all
Choice: >
```

Accepted responses:

- `a` — select all `partial` and `empty` days.
- `p=YYYY-MM-DD,YYYY-MM-DD` — explicit comma-separated date list; any date
  not in the working-day set is rejected with an error and re-prompted.
- `s` — skip all; exit immediately with summary showing 0 days logged.

ASCII flow:

```
┌─────────────────────────────────────────┐
│  [a] all non-full  [p] pick  [s] skip   │
└─────────────────────────────────────────┘
         │               │           │
         ▼               ▼           ▼
   all partial+     explicit      exit (0
   empty days       date list     logged)
```

---

## Phase 2 — Per-day interactive loop

Print phase header:
```
--- Phase 2 — Per-day interactive loop ---
```

Iterate over selected days in ascending date order (Stable sort keys rule).

---

### 2.1 Source fetch (parallel)

Fetch from all enabled source connectors simultaneously:

**git connector:**
```
commits_for(date=day, repos=git_repos+cwd, author_email=currentUser)
  → WorkEvent[]  kind=commit
                 issue_key = first match of /[A-Z][A-Z0-9]+-[0-9]+/ in subject
                             (null if no match)
                 raw_weight = 1
```

**jira-activity connector:**
```
events_for(date=day, assignee=currentUser, project=project)
  → WorkEvent[]  kind ∈ {comment, status-change, assignment, field-edit}
                 issue_key = issue the event belongs to
                 raw_weight per kind:
                   comment       = 1
                   status-change = 3
                   assignment    = 2
                   field-edit    = 2
```

If a source connector returns `unsupported`, skip it for this day and emit:
```
Warning: {connector} source unavailable — skipping {kind} events
```
Continue with the remaining sources.

---

### 2.2 Grouping

- Group `WorkEvent` records by `issue_key`.
- Events with `issue_key == null` (commit with no extractable key) are placed
  into a pseudo-bucket:
  ```
  unassigned-<7-char-prefix>
  ```
  where the 7-char prefix is the first 7 characters of the commit's SHA-1
  hash.
- If two unkeyed commits have different hashes, they get separate
  `unassigned-*` buckets.
- If **zero events total** across all sources: present one empty
  `unassigned` slot with the full `target_minutes` as its proposed allocation.

---

### 2.3 Distribution algorithm

```
total_weight = sum(events.raw_weight for all events across all buckets)

for issue_key, events in grouped:
    share = sum(e.raw_weight for e in events) / total_weight
    raw_minutes = share * target_minutes
    rounded = round(raw_minutes / step_minutes) * step_minutes
    allocation[issue_key] = rounded

residue = target_minutes - sum(allocation.values())

if residue != 0:
    highest = issue_key with max sum(raw_weight)
    # tie-break: issue_key sorts first alphabetically
    # (Stable sort keys rule from idempotency.md)
    allocation[highest] += residue
```

`step_minutes` defaults to 30 (overridable via `step` parameter or config).
The residue adjustment guarantees `sum(allocation) == target_minutes` after
rounding.

---

### 2.4 Interactive edit prompt

```
Issue    | Source hints           | Proposed
-------- | ---------------------- | ---------
PROJ-10  | 3 commits, 1 comment  | 5h
PROJ-15  | 1 status-change       | 3h
-------- | ---------------------- | ---------
Total    |                        | 8h

Commands: KEY=Nh[Mm]  +Nh on KEY  -Nm on KEY  rm KEY  add  accept
>
```

**Supported commands:**

| Command | Effect |
|---------|--------|
| `KEY=Nh` or `KEY=NhMm` | Set allocation for KEY explicitly. |
| `+Nh on KEY` | Add time to KEY's allocation. |
| `-Nm on KEY` | Subtract time from KEY's allocation. |
| `rm KEY` | Remove KEY bucket from the distribution entirely. |
| `add` | Enter the ad-hoc task creation sub-flow (see §Ad-hoc sub-flow). |
| `accept` | Proceed to deviation check and comment collection. |

After each command, re-render the table with updated values. Loop until
`accept` is entered.

---

### 2.5 Deviation check on `accept`

Compute `total = sum(allocation.values())`.

If `|total - target_minutes| / target_minutes > deviation_warning_pct`
(default 5%):

```
Total Nh != target Th.
(a)ccept as-is  (r)edistribute proportionally  (e)dit
>
```

Responses:

- `a` — proceed with current total as-is.
- `r` — rescale all allocations proportionally:
  ```
  for k in allocation:
      new_alloc[k] = round(allocation[k] * target_minutes / total / step_minutes)
                     * step_minutes
  residue = target_minutes - sum(new_alloc.values())
  new_alloc[highest_weight_key] += residue
  # tie-break: alphabetical issue_key (Stable sort keys rule)
  ```
  Result: `sum(new_alloc) == target_minutes` exactly.
- `e` — return to the edit loop (step 2.4).

ASCII flow:

```
accept
  │
  ▼
|total - target| > 5% ?
  ├── no  ──────────────────────────────────────────► comment collection
  └── yes
        │
        ▼
  (a)ccept-as-is  (r)edistribute  (e)dit
        │               │              │
        ▼               ▼              │
   proceed         rescale all    ◄────┘
                   to target
```

---

### 2.6 Comment collection (per issue)

For each issue in the distribution, prompt:

```
Comment for PROJ-10 (enter to use default):
Default: abc1234, def5678: Fix login timeout — add retry logic
>
```

**Default template** (when git events are present for this issue):
```
<short-hashes joined by ", ">: <first-commit-subject truncated to 100 chars>
```
Short-hash = first 7 chars of each commit SHA-1. Multiple commits are joined
with `", "` in commit-date order.

**No git events:** default comment is blank (empty string).

Press Enter to accept the default. Any typed text replaces the default entirely.

---

### 2.7 Dry-run summary

```
--- Dry run for 2026-04-21 ---
PROJ-10:  5h  "abc1234, def5678: Fix login timeout — add retry logic"
PROJ-15:  3h  "Status: In Review → Done"
Total:    8h

Write these worklogs? [y/N]
```

Require an explicit `y` to proceed. Any other input (including blank Enter)
aborts the write for this day. Days aborted here receive status
`user-skipped` in the Phase 3 report.

---

### 2.8 Write loop

Active sink is determined in Phase 0. Primary: Tempo. Fallback to
jira-worklog only on Tempo `unsupported` (MUST NOT fall through on `auth`).

For each `(issue_key, duration_minutes, comment)` in the distribution:

1. Call `list_worklogs(issue_key, author_email=currentUser, date=day)` on the
   active sink connector.
2. If an existing worklog has **byte-identical** `duration_minutes` AND
   `comment` for the same issue, day, and author → skip write; count as
   `idempotent` (Existing worklogs are source of truth rule from
   `idempotency.md`).
3. Otherwise call `create_worklog(issue_key, date, duration_minutes, comment,
   author_email)`.
4. On per-issue write failure: log the failure; continue with remaining
   issues on this day and with remaining days. Day is marked `partial-failed`
   in the Phase 3 report.

---

### 2.9 Per-day summary

Print after each day's write loop completes:

```
2026-04-21:
  logged:               PROJ-10 (5h), PROJ-15 (3h)
  skipped (idempotent): —
  failed:               —
```

Absent sections render as `—` (Missing-value sentinel rule from
`idempotency.md`).

---

## Ad-hoc task creation sub-flow

Triggered by the `add` command in the Phase 2 edit loop.

### Step 1 — Title prompt

```
Title? >
```

Accept a free-text title from the user.

### Step 2 — JQL search

Execute the fully-resolved JQL (Deterministic `JQL:` line rule from `idempotency.md`):

```
project = {PROJECT} AND summary ~ "{title}" ORDER BY updated DESC
```

All placeholders are substituted with runtime values before the query is sent.
The fully-resolved query string is what goes on any audit `JQL:` line. Show
the top 5 results:

```
[1] PROJ-88  Fix flaky login test — intermittent failures (In Progress, 2d ago)
[2] PROJ-102 Stabilize login test suite (To Do, 5d ago)
[new] Create new issue
```

### Step 3 — Pick existing or create new

**Pick `N` (1–5):**
- Log to the selected existing issue.
- No new issue is created.
- Return to the Phase 2 edit loop with the issue added to the distribution.

**Pick `new`:**

1. Confirm issue type:
   ```
   Issue type [Story]: >
   ```
   Default is `auto_task_type` from config (default: `Story`). Validate
   against the project's create-screen metadata from the jira connector.

2. Resolve active sprint:
   ```
   GET /rest/agile/1.0/board/{boardId}/sprint?state=active
   ```
   Use the first result with `state=active`.

3. Create the issue via jira connector:
   - `project` = resolved project key
   - `summary` = title entered in step 1
   - `assignee` = `currentUser()`
   - `issuetype` = confirmed type
   - `labels` = `[auto_task_label]` (default: `"auto-logged"`)
   - `sprint` = active sprint id

   The `auto-logged` label MUST always be applied (Auto-created artifacts are
   labeled rule from `idempotency.md`). Future `add` flows MUST search for
   this label so re-runs find the existing issue before creating a duplicate.

4. Prompt for allocation:
   ```
   Hours for PROJ-201? >
   ```

5. Fold the new issue and its allocation into the current day's distribution.
   Return to the Phase 2 edit loop.

ASCII flow:

```
add
 │
 ▼
Title? ──► JQL search (top 5)
              │
       ┌──────┴───────┐
       ▼              ▼
   Pick N           [new]
   (reuse)            │
       │         confirm type
       │         resolve sprint
       │         create issue (+auto-logged label)
       │         prompt hours
       └──────────────┘
              │
              ▼
    add to distribution
    return to edit loop
```

---

## Phase 3 — Final report

Print phase header:
```
--- Phase 3 — Final report ---
```

Print the summary table for all days in the run, ascending by `date` string
(Stable sort keys rule from `idempotency.md`). Missing cells use `—`
(Missing-value sentinel rule from `idempotency.md`):

```
date        | issues           | logged | target | delta | status
----------- | ---------------- | ------ | ------ | ----- | ------
2026-04-21  | PROJ-10, PROJ-15 | 8h     | 8h     | 0     | logged
2026-04-22  | PROJ-10          | 7h 30m | 8h     | -30m  | partial-failed
2026-04-24  | —                | 8h     | 8h     | 0     | skipped (full)
```

**Status values:**

| Value | Meaning |
|-------|---------|
| `logged` | All issues written successfully. |
| `skipped (idempotent)` | All worklogs already existed byte-identically; no writes needed. |
| `partial-failed` | At least one issue write failed; others succeeded. |
| `skipped (full)` | Day had `logged_minutes >= 99% target`; auto-skipped in Phase 1. |
| `user-skipped` | User answered `N` at the dry-run prompt, or entered `s` at the Phase 1 selection prompt. |

**Trailing lines** (always present, always last):

```
Source: git=local, jira-activity=rest
Sink: tempo=rest
Generated: 2026-04-27T10:00:00Z
```

- `Source:` — lists each enabled source connector and the resolved transport
  layer (e.g. `local`, `mcp`, `rest`, `cli`).
- `Sink:` — names the active sink connector and its resolved layer. If Tempo
  fell through to jira-worklog, render `jira-worklog=rest`.
- `Generated:` — the `now` timestamp captured in Phase 0.0 (Single `now` rule
  from `idempotency.md`). This value MUST NOT be re-captured here.

After the trailing lines, save the resolved project key to memory
`jira:last-project` (first successful run of Phase 3 commits this).

---

## Idempotency summary

All rules cited are defined in
`plugins/misc/skills/integrations/references/idempotency.md`.

| Rule | Where applied |
|------|---------------|
| **Single `now`** | Phase 0.1 — one UTC timestamp, reused everywhere. |
| **Atomic writes** | Phase 0.4 — config materialization; Phase 1.1 — holiday cache writes. |
| **Stable sort keys** | Phase 1.4 — day table; Phase 2.3 — residue tie-break; Phase 3 — report table. |
| **Missing-value sentinel** | Phase 1.4 table; Phase 2.9 per-day summary; Phase 3 report table. |
| **Existing worklogs are source of truth** | Phase 2.8 — duplicate detection before write. |
| **Auto-created artifacts are labeled** | Ad-hoc sub-flow step 3 — `auto-logged` label on every created issue. |
| **Deterministic `JQL:` line** | Ad-hoc sub-flow step 2 — fully-resolved query before execution. |

---

## Error handling reference

| Condition | Phase | Behavior |
|-----------|-------|----------|
| vacation-store `unsupported` | 0.5 | Surface error verbatim, suggest checking `${CLAUDE_PLUGIN_DATA}`, and stop. |
| jira `auth` or `network` | 0.5 | Stop immediately. Surface `Auth failed for jira. Check credentials.` No token echo. |
| BambooHR `auth` | 0.5 | Stop immediately. Surface error, suggest re-checking `BAMBOOHR_API_KEY` (masked). |
| BambooHR `unsupported` | 0.5 | Skip BambooHR; proceed with vacation-store only. Emit warning. |
| holidays connector unavailable | 1.1 | Proceed without holiday filtering. Emit warning. |
| Tempo `auth` | 2.8 | Stop immediately. MUST NOT fall through to jira-worklog. |
| Tempo `unsupported` | 2.8 | Fall through to jira-worklog sink. Record in `Sink:` line. |
| jira-worklog `auth` | 2.8 | Stop immediately. No further fallthrough. |
| git source `unsupported` | 2.1 | Skip git for this day. Emit warning. Continue. |
| jira-activity `unsupported` | 2.1 | Skip jira-activity for this day. Emit warning. Continue. |
| Per-issue write failure | 2.8 | Log failure; continue with remaining issues and days. Mark day `partial-failed`. |
| Rate-limited (HTTP 429) | any | Honor `Retry-After`; else exponential backoff: 1 s, 2 s, 4 s (max 3 attempts). After third failure: `Rate limited; retry later.` Stop the affected operation. |
