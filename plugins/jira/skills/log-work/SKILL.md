---
name: log-work
description: Interactively log 8h/day of Jira worklogs across 1–5 issues, including missing-day catch-up over a configurable lookback window. Collects source events (git commits, Jira activity) via connectors, proposes a distribution rounded to 30-minute steps, asks for confirmation, then writes worklogs through Tempo (primary) or native Jira (fallback). Creates ad-hoc Jira issues in the active sprint when no existing issue fits, after searching for a reusable candidate. Use when the user runs /jira:log-work, asks to log time, catch up on missed logging days, fill in a timesheet, or record work to Jira — including for specific dates or specific issue keys.
---

# log-work

## Prerequisite

This skill depends on the following connectors. All connector references live under `plugins/misc/skills/integrations/references/`.

**Source connectors** (produce normalized work events; MUST NOT mutate remote state):

- `plugins/misc/skills/integrations/references/git.md` — reads local git commits per day, extracts issue keys via regex, emits `WorkEvent` records of `kind=commit`.
- `plugins/misc/skills/integrations/references/jira-activity.md` — reads Jira changelog entries (status changes, comments, assignments, field edits) for the current user per day, emits `WorkEvent` records.

**Sink connectors** (write worklog entries; require explicit confirmation before invocation):

- `plugins/misc/skills/integrations/references/tempo.md` — **primary sink**. Writes worklogs to Tempo (Cloud REST v4 or Tempo Timesheets DC). On `unsupported` at every probe layer, the caller falls through to the jira-worklog sink.
- `plugins/misc/skills/integrations/references/jira-worklog.md` — **fallback sink**. Writes worklogs via native Jira worklog API. Active only when Tempo returns `unsupported`; MUST NOT activate on `auth` or `network` from Tempo.

**Aux connectors** (supporting reads; MAY be called freely as long as they remain read-only):

- `plugins/misc/skills/integrations/references/jira.md` — core Jira aux connector. Used for issue search, issue create, sprint lookup, worklog listing, and field-metadata resolution.
- `plugins/misc/skills/integrations/references/location.md` — detects the user's ISO-3166-1 alpha-2 country and IANA timezone from OS region signals. Cached in memory under `jira:log-time:country`.
- `plugins/misc/skills/integrations/references/holidays.md` — resolves public holidays for `(year, country)` from date.nager.at, with disk-cache fallback at `${CLAUDE_PLUGIN_DATA}/holidays-{country}-{year}.json`. Only `type=public` holidays are filtered.
- `plugins/misc/skills/integrations/references/bamboohr.md` — **vacation read source** (aux). Probed during Phase 1 to load approved time-off requests. `auth` or `network` errors stop execution; `unsupported` degrades to vacation-store only.
- `plugins/misc/skills/integrations/references/vacation-store.md` — **vacation read source** (aux, always required). Reads `${CLAUDE_PLUGIN_DATA}/vacations.json` to exclude vacation and sick days from the catch-up scan. This skill MUST NOT call `add_entry`, `update_entry`, or `remove_entry` on the vacation-store; `log-vacation` is the sole writer.

The vacation-store connector MUST be resolved on every run. If it returns `unsupported`, surface the error and stop. Failure to resolve the jira connector in Phase 0 MUST also stop execution immediately.

## Invocation

```
/jira:log-work [date=today|YYYY-MM-DD] [target=8h] [lookback=7d] [project=KEY] [country=XX]
```

Additional parameters are accepted as named key=value pairs in any order. See Parameters for the full list.

## Parameters

| Parameter  | Required | Default                        | Description                                                                                                                              |
|------------|----------|--------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| `date`     | no       | today (UTC)                    | Target date for single-day logging, or anchor for the lookback window. ISO-8601 `YYYY-MM-DD` or the literal `today`.                    |
| `target`   | no       | `8h`                           | Daily worklog target. Accepts `Nh` (hours) or `NhMm` (hours and minutes). The distribution proposed in Phase 2 MUST sum to this value. |
| `lookback` | no       | `7d`                           | Lookback window from `date` in days (e.g. `7d`, `30d`). The Phase 1 scan covers `[date - lookback, date]` inclusive.                   |
| `project`  | no       | memory `jira:last-project`     | Jira project key. Resolved from arg → memory → interactive prompt. Saved to memory after a successful run.                              |
| `country`  | no       | detected via location connector | ISO-3166-1 alpha-2 country code for holiday filtering. Overrides the location connector result for this run only.                       |
| `sources`  | no       | config `sources.enabled`       | Override the enabled source connector list for this run. Comma-separated connector names, e.g. `sources=git,jira-activity`.             |
| `sinks`    | no       | config `sinks.primary/fallback` | Override the sink priority order for this run. Comma-separated connector names, e.g. `sinks=jira-worklog` to skip Tempo.               |
| `step`     | no       | `30m`                          | Rounding granularity for the proposed distribution. Accepts `Nm` (minutes). Must divide 60 evenly; e.g. `15m`, `30m`.                  |
| `redetect` | no       | `false`                        | When `true`, forces re-probe of country and location even if memory has a cached value within its 30-day TTL.                           |

## Configuration

Full schema is defined in `plugins/jira/skills/log-work/references/config-schema.md`. The config file lives at `${CLAUDE_PLUGIN_DATA}/log-work.json`.

**Precedence (highest to lowest):**

1. CLI argument — overrides everything for the current run only.
2. Memory key — values stored in Claude memory (e.g. `jira:last-project`, `jira:log-time:country`).
3. Config file — `${CLAUDE_PLUGIN_DATA}/log-work.json`. Written atomically on first successful run using the Atomic writes rule from `idempotency.md` (write to `.tmp`, fsync, rename over target).
4. Built-in default — values baked into the skill (e.g. `target=8h`, `lookback=7d`, `step=30m`).

Config is **read-only** after first materialization. To change a value (e.g. `target_hours`, `workdays`, `git_repos`), the user edits `log-work.json` manually. The skill MUST NOT rewrite config on subsequent runs unless the file is absent.

**Default config shape** (written on first run if missing):

```json
{
  "target_hours": 8,
  "step_minutes": 30,
  "workdays": ["mon","tue","wed","thu","fri"],
  "sources": { "enabled": ["git","jira-activity"] },
  "sinks":   { "primary": "tempo", "fallback": "jira-worklog" },
  "location_connector": "location",
  "holidays_connector": "holidays",
  "vacation_connectors": ["bamboohr","vacation-store"],
  "auto_task_label": "auto-logged",
  "auto_task_type": "Story",
  "lookback_default_days": 7,
  "day_start_local": "09:00",
  "git_repos": [],
  "event_weights": {
    "commit": 1.0,
    "comment": 1.0,
    "status-change": 3.0,
    "assignment": 2.0,
    "field-edit": 2.0
  },
  "deviation_warning_pct": 5
}
```

`git_repos` is an array of absolute filesystem paths scanned by the git connector in addition to the repo at the current working directory. An empty array means only the current repo is scanned. Schema validation rules and permitted value ranges are documented in `plugins/jira/skills/log-work/references/config-schema.md`.

## Pipeline overview

Full per-phase detail lives in `plugins/jira/skills/log-work/references/pipeline.md`. The four phases are summarized below.

### Phase 0 — Resolve context

Capture one UTC timestamp (`now`) at skill start and reuse it for all age math, cache-bucket selection, and the `Generated:` line per the Single `now` rule from `idempotency.md`. Resolve the active `project` (arg → memory key `jira:last-project` → interactive prompt; save to memory on success). Resolve `country`: arg → memory key `jira:log-time:country` (reuse if set within 30 days and `redetect` is false) → probe via the location connector in declared probe order (os-region → locale-env → tz-country table → user prompt); record the winning layer as `jira:log-time:country-detected-by`. Load config from `${CLAUDE_PLUGIN_DATA}/log-work.json`, merging with built-in defaults; write the merged config atomically if the file was missing. Probe all required connectors in their declared probe order per their connector references; an `auth` or `network` error from any required connector MUST stop execution immediately.

### Phase 1 — Catch-up scan

Build the working-day set for `[date - lookback, date]`: remove weekends (per `workdays` config, default Mon–Fri), remove public-holiday dates (type=public only, via holidays connector, disk-cached at `${CLAUDE_PLUGIN_DATA}/holidays-{country}-{year}.json`), remove days covered by vacation or sick entries (read from vacation-store in read-only mode; merged in-memory with BambooHR results when BambooHR resolves to a reachable layer). Days with `reason=sick` are excluded from auto-logging in v1 alongside `reason=vacation` and `reason=holiday` entries. For each working day in the resulting set, query the jira connector for the current user's existing worklogs on that day and compute `logged_minutes`. Classify: `full` (≥ 99% of target, auto-skipped with no user interaction), `partial` (some time logged but below target), `empty` (zero minutes logged). Render the classification table in ascending date order. Prompt: accept all / pick specific dates / skip all.

### Phase 2 — Per-day interactive loop

For each selected day, fetch source events in parallel: `git` connector (`commits_for(date, repos, author_email)`) and `jira-activity` connector (`events_for(date, assignee=currentUser, project)`). Group events by issue key; commits with no extracted issue key receive a pseudo-bucket named `unassigned-<7-char-hash-prefix>`. Compute proposed minutes per issue from normalized `raw_weight` (commit=1, comment=1, status-change=3, assignment=2): sum weights per bucket, normalize to fractions of `target`, round each to `step` minutes, rescale so the rounded total equals `target`. Rounding residue (surplus or deficit after rounding) is applied to the bucket with the highest total weight; if there is a tie, apply to the bucket whose issue key sorts first alphabetically per the Stable sort keys rule from `idempotency.md`.

Display the proposal table (`Issue | Source hints | Proposed`). Enter the interactive edit loop. Supported commands:

- `KEY=Nh` or `KEY=NhMm` — set issue allocation explicitly.
- `+Nh on KEY` — add time to a bucket.
- `-Nm on KEY` — subtract time from a bucket.
- `rm KEY` — remove a bucket from the distribution.
- `add` — enter the ad-hoc task creation flow (see Ad-hoc task creation flow).
- `accept` — proceed to comment collection and write.

On `accept`, if `|total - target| > 5%`, warn with `Total Nh != target Th. (a)ccept / (r)edistribute / (e)dit`. `r` rescales all buckets proportionally to reach exactly `target`; `e` returns to the loop; `a` accepts as-is. Collect per-issue comment (default template when git events are present: `<short-hashes>: <first-commit-summary truncated to 100 chars>`; blank otherwise). Show dry-run summary. Require explicit `y` to proceed. Write via the active primary sink (Tempo); fall through to jira-worklog on `unsupported` from Tempo. Before each `create_worklog` call, query `list_worklogs(issue_key, author_email, date)` on the active sink and skip if a byte-identical record exists. Log any per-issue write failures and continue with remaining issues. Per-day summary: `logged: [...]`, `skipped (idempotent): [...]`, `failed: [...]`.

### Phase 3 — Final report

Print the summary table (see Output contract). Append trailing `Source:`, `Sink:`, and `Generated:` lines.

## Ad-hoc task creation flow

Triggered when the user enters `add` during the Phase 2 edit loop. Follows spec §5.5.

1. Prompt: `Title?` — accept a free-text title.
2. Search via jira connector using the fully resolved JQL (per the Deterministic `JQL:` line rule from `idempotency.md`):
   ```
   project = {PROJECT} AND summary ~ "{title}" ORDER BY updated DESC
   ```
   Substitute the runtime project key and title before executing. Show the top 5 matching issues as a numbered list: `[N] KEY Summary… (status, updated Xd ago)`.
3. If the user picks a number, log to that existing issue. No new issue is created.
4. If the user picks `new`:
   - Confirm issue type (default: `Story`, configurable via `auto_task_type` in config-schema; validated against the project's create-screen metadata from the jira connector).
   - Create the issue via the jira connector: `assignee=currentUser()`, sprint = active sprint id resolved from `GET /rest/agile/1.0/board/{boardId}/sprint?state=active`, `labels=[auto_task_label]` (default: `auto-logged`). The `auto-logged` label MUST always be applied per the Auto-created artifacts are labeled rule from `idempotency.md`.
   - Future `add` searches MUST find this issue before creating another, because the label is present — per the Auto-created artifacts are labeled rule from `idempotency.md`.
5. Prompt for hours to allocate to this issue. Fold into the current day's distribution and return to the edit loop.

## Output contract

**Between phases**, print phase headers as plain text (e.g. `--- Phase 1: Catch-up scan ---`) so the user can follow progress.

**Phase 1 day-selection table** (ascending `date`, tie-broken by `date` string — stable per Stable sort keys rule from `idempotency.md`):

```
date        | logged   | target | delta  | status
----------- | -------- | ------ | ------ | -------
2026-04-21  | 0h       | 8h     | -8h    | empty
2026-04-22  | 3h 30m   | 8h     | -4h30m | partial
2026-04-24  | 8h       | 8h     | 0      | full (skipped)
```

**Final report table** columns: `date`, `issues`, `logged`, `target`, `delta`, `status`. Missing cells render as `—` (em-dash, U+2014) per the Missing-value sentinel rule from `idempotency.md`. Status values: `logged`, `skipped (idempotent)`, `partial-failed`, `skipped (full)`.

```
date        | issues                  | logged | target | delta | status
----------- | ----------------------- | ------ | ------ | ----- | ------
2026-04-21  | PROJ-10, PROJ-12        | 8h     | 8h     | 0     | logged
2026-04-22  | PROJ-10, PROJ-15        | 7h 30m | 8h     | -30m  | partial-failed
2026-04-24  | —                       | 8h     | 8h     | 0     | skipped (full)
```

**Trailing lines** (always present, always last):

```
Source: git=local|mcp|cli, jira-activity=mcp|rest, ...
Sink: tempo=mcp|rest (or jira-worklog=mcp|rest)
Generated: <ISO-8601 UTC>
```

`Source:` lists each enabled source connector and the resolved transport layer. `Sink:` names the active sink connector and its layer. All timestamps derive from the single `now` captured at skill start per the Single `now` rule.

## Idempotency guarantees

This skill follows the rules defined in `plugins/misc/skills/integrations/references/idempotency.md`. Specific guarantees:

- **Single now** — one UTC timestamp is captured at skill start and reused for all age math, cache-bucket selection, and the `Generated:` line. `Date.now()` or equivalent MUST NOT be called more than once per run.
- **Atomic writes** — config materialization and holiday-cache writes follow the write-to-`.tmp` → fsync → rename-over-target sequence. A partial write MUST NOT leave the target in a corrupt state.
- **Stable sort keys** — every sort operation fully specifies tie-breakers. The Phase 1 day list sorts ascending by `date` (ISO-8601 string, lexicographically stable). The final report sorts the same way. No wall-clock values appear as sort inputs.
- **Re-run safety** — re-running the skill for the same day detects existing worklogs via the sink connector's `list_worklogs(issue_key, author_email, date)` before writing. If an existing worklog has byte-identical `duration_minutes` and `comment` on the same issue, day, and author, the write is skipped and the entry counted as `skipped (idempotent)`. Any other state (different duration, different comment, or no existing worklog) results in a new entry being added.
- **Duplicate worklog detection** — tracked via the worklog-id set returned by the active sink connector per call. The connector is the authoritative source; this skill MUST NOT maintain a separate local ID cache.
- **Auto-created issue deduplication** — before calling `new` in the add flow, the JQL search includes previously `auto-logged`-labeled issues so re-runs find the existing issue instead of creating a duplicate.

## Error handling

| Condition | Behavior |
|-----------|----------|
| Jira connector `auth` failure | Stop immediately in Phase 0. Surface `Auth failed for jira. Check credentials.` No token echo. |
| Jira connector `network` failure | Stop immediately in Phase 0. Surface the network error and stop. |
| Tempo connector `auth` failure | Stop immediately. MUST NOT fall through to jira-worklog (`auth` stops cross-connector fallthrough per `tempo.md`). |
| Tempo connector `unsupported` (all probe layers) | Fall through to jira-worklog sink. Record transition in `Sink:` line. |
| jira-worklog connector `auth` failure | Stop immediately. Surface error. No further fallthrough available. |
| git connector unavailable (`unsupported`) | Skip git as a source for affected days. Emit `Warning: git source unavailable — skipping commit events`. Continue with remaining sources. |
| jira-activity connector unavailable | Skip jira-activity as a source for affected days. Emit `Warning: jira-activity unavailable — skipping Jira event hints`. Continue. |
| holidays connector unavailable (both layers fail) | Proceed without holiday filtering. Emit `Warning: holidays unavailable for {country}-{year} — public holidays not excluded`. |
| BambooHR connector `auth` failure | Stop immediately. Surface error, suggest re-checking `BAMBOOHR_API_KEY` (masked per connector-pattern §Auth). Auth errors MUST escalate; silent fallthrough is forbidden. |
| BambooHR connector `unsupported` | Skip BambooHR vacation source. Proceed using vacation-store only. Emit `Warning: BambooHR unavailable — using local vacation store only`. |
| vacation-store connector `unsupported` | Surface the connector error verbatim, suggest checking `${CLAUDE_PLUGIN_DATA}`, and stop. Required connector; cannot be skipped. |
| Rate-limited (429) on any connector | Honor `Retry-After` header when present; otherwise apply exponential backoff: 1 s, 2 s, 4 s (max 3 attempts). After third failure, surface `Rate limited; retry later.` and stop the affected connector operation. |
| Phase 2 individual worklog write failure | Log failure for that issue, continue with remaining issues on the same day and with remaining days. Final report marks the day as `partial-failed`. |

## Cloud vs on-prem notes

Detection logic is defined in `plugins/misc/skills/integrations/references/jira.md` §Probe order. This skill follows that detection result without re-probing.

**Cloud (Jira REST v3):**

- Issue search: `POST /rest/api/3/search/jql` (MUST NOT use the legacy `/rest/api/3/search` path).
- Worklog write (jira-worklog sink): `comment` field MUST be wrapped in Atlassian Document Format (ADF). The connector handles wrapping; this skill passes plain text.
- Pagination: `nextPageToken` in response body; pass as query param on subsequent pages.

**On-prem (Jira REST v2, Server / Data Center):**

- Issue search: `POST /rest/api/2/search`.
- Worklog write: `comment` field is plain text.
- Pagination: `startAt` + `maxResults` offset-based, default page size 50.

For Tempo, Cloud uses `POST https://api.tempo.io/4/worklogs` (bearer `TEMPO_API_TOKEN`). On-prem uses `POST ${JIRA_BASE_URL}/rest/tempo-timesheets/4/worklogs` (bearer `JIRA_PAT`). The tempo connector handles endpoint selection transparently; this skill passes the same normalized worklog record regardless of deployment type.

## Examples

**1. Default run (today, 8h target, 7-day lookback):**

```
/jira:log-work
```

Scans the last 7 working days. Skips full days, presents partial and empty days for interactive logging. Uses project from memory `jira:last-project`.

**2. Explicit date — log a specific past day:**

```
/jira:log-work date=2026-04-25
```

Sets `date=2026-04-25` as both the anchor and the single target day (lookback window collapses to that date only when the date is in the past within the lookback). The scan covers `[2026-04-25 - 7d, 2026-04-25]`.

**3. Explicit project key:**

```
/jira:log-work project=MYPROJ
```

Uses `MYPROJ` as the active project for issue search, ad-hoc task creation, and sprint resolution. Saves `MYPROJ` to memory `jira:last-project` on successful run.

**4. Extended lookback for monthly catch-up:**

```
/jira:log-work lookback=30d
```

Scans the last 30 working days (minus weekends, holidays, and vacation entries). Presents all empty and partial days in ascending order before the interactive loop begins.

**5. Custom daily target:**

```
/jira:log-work target=6h
```

Proposes a distribution summing to 6 hours instead of 8. The 5% tolerance check and redistribution offer scale proportionally.

**6. Override sinks — skip Tempo, use native Jira worklog directly:**

```
/jira:log-work sinks=jira-worklog
```

Bypasses the Tempo probe entirely for this run. Writes via jira-worklog sink regardless of Tempo availability. Useful when Tempo is misconfigured or down.

**7. Force re-detect country and location:**

```
/jira:log-work redetect=true
```

Ignores the cached `jira:log-time:country` memory value (even if within the 30-day TTL) and re-probes the location connector from scratch. Useful after traveling to a new region.

**8. Catch up a single specific past day:**

```
/jira:log-work date=2026-04-21
```

The scan window is `[2026-04-14, 2026-04-21]`. If only 2026-04-21 is empty or partial, only that day is presented. The user skips all others via the Phase 1 prompt.

**9. Override rounding step to 15 minutes:**

```
/jira:log-work step=15m
```

Rounds all proposed durations to the nearest 15 minutes instead of 30. The residue from rounding still lands on the highest-weight issue to ensure the total always equals `target`.

**10. Ad-hoc task creation — reuse existing issue:**

The user has a day with one git commit referencing no issue key. In Phase 2, the proposal shows `unassigned-abc1234: 8h`. The user types `add`, enters the title `"Fix flaky login test"`. The skill executes the JQL search and displays:

```
[1] PROJ-88  Fix flaky login test — intermittent failures (In Progress, updated 2d ago)
[2] PROJ-102 Stabilize login test suite (To Do, updated 5d ago)
new  Create a new issue
```

The user picks `1`. The skill logs 8h to `PROJ-88` with the default git comment. No new issue is created.

**11. Ad-hoc task creation — new issue in sprint:**

Same scenario but no existing issue matches. The user picks `new`. The skill confirms issue type (`Story`), creates `PROJ-201 "Fix flaky login test"` in the active sprint with `assignee=currentUser()` and `labels=["auto-logged"]`. Returns to the edit loop with `PROJ-201: 8h` in the distribution. On a re-run of the same day, the JQL search finds `PROJ-201` (via the `auto-logged` label) and offers it before creating another.

