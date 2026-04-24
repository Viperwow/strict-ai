# Jira time-logging skills — design

**Date:** 2026-04-25
**Author:** Viperwow
**Status:** Draft — pending user review
**Scope:** Two new skills (`log-work`, `log-vacation`) in the `jira` plugin, plus a shared `integrations` meta-skill in the `misc` plugin housing all connector references.

## 1. Problem

The user works roughly 8 hours per day on 1–5 tasks, some of which are not represented as Jira issues. Time-logging tends to fall behind (sometimes by several days or a week), and individual worklog entries must hit the right issue in the active sprint — with a new issue auto-created when no suitable one exists. Worklog writing should use Tempo when available and fall back to native Jira worklog otherwise. Vacation/holiday days must be excluded from the "missing logs" sweep.

## 2. Goals

- Run an interactive command that, for each working day in a lookback window, collects activity hints (git commits, Jira issue activity, etc.), proposes a worklog distribution that sums to the daily target (8h by default), and writes worklogs after user confirmation.
- Identify ad-hoc work (not in Jira), suggest reusing an existing similar issue in the current project/sprint, or create a new standalone issue in the active sprint when none fits. Creation is interactive, one issue at a time.
- Detect days with partial or missing worklogs over a configurable lookback (default 7 days, up to ~30 for monthly catch-up) so nothing is silently skipped.
- Keep vacation/time-off management separate: a second skill handles CRUD over a local vacation store, optionally synced from BambooHR.
- All external I/O (Jira, Tempo, BambooHR, git, holidays API, OS locale) flows through a uniform **connector** abstraction, so new sources can be added by dropping a reference file, without changing skill logic.
- Respect the existing `check-status` skill style (deterministic output, JQL trailing line, Source line, idempotent re-runs).

## 3. Non-goals (v1)

- No automated scheduled runs. Scheduling and session-close hooks are deferred. v1 is strictly manual invocation.
- No background draft-generation. A draft file layout may be added later; for now the skill collects sources live on each run.
- No rollback on partial failure when writing worklogs. Individual worklogs are independent; the skill reports which succeeded and which failed and continues.
- No writing/removing worklogs already present (e.g., manual entries made earlier). The skill only *adds* the missing delta.
- No Tempo-specific analytics. Tempo is used only as a worklog sink.

## 4. Architecture overview

### 4.1 Plugin layout

```
plugins/
  jira/
    .claude-plugin/plugin.json               # only file in .claude-plugin/
    skills/
      check-status/                          # existing; refactored to reference shared connectors
        SKILL.md
        references/design.md
      log-work/                              # new
        SKILL.md
        references/
          pipeline.md                        # per-phase flow detail
          config-schema.md                   # log-work.json schema
      log-vacation/                          # new
        SKILL.md
        references/
          store-schema.md                    # vacations.json schema
  misc/
    .claude-plugin/plugin.json
    skills/
      regain-focus/                          # existing, unchanged
      integrations/                          # new; `disable-model-invocation: true`
        SKILL.md                             # index of connectors + how to consume them
        references/
          connector-pattern.md               # base contract every connector must satisfy
          idempotency.md                     # shared determinism rules
          jira.md                            # Jira core: search, issue CRUD
          jira-activity.md                   # source: status changes, comments, assignments
          jira-worklog.md                    # sink: native Jira worklog
          tempo.md                           # sink: Tempo (primary), falls through to jira-worklog
          bamboohr.md                        # aux: time-off read
          git.md                             # source: commits per day
          location.md                        # aux: country/timezone detection
          holidays.md                        # aux: public holidays
          vacation-store.md                  # aux: local vacations.json CRUD
          tz-country.json                    # bundled tz → ISO-3166-1 alpha-2 table
```

### 4.2 Connector contract

Every file under `plugins/misc/skills/integrations/references/` (except `connector-pattern.md`, `idempotency.md`, and bundled data) is a **connector reference** and MUST satisfy the template in `connector-pattern.md`. Each connector declares:

1. **Probe order** — stop at the first success, never silently downgrade on auth/network error (use `jira-connector` fallthrough semantics from the existing `check-status` skill as precedent).
2. **Auth** — credential env vars, memory keys, masking rules (no token echo).
3. **Capabilities** — operations (`read`, `write`), supported entities (issues, worklogs, etc.), pagination form, rate-limit handling.
4. **Output shape** — normalized JSON schema independent of the underlying source (MCP vs CLI vs REST).
5. **Error taxonomy** — `auth`, `not-found`, `rate-limited`, `network`, `unsupported`, mapped from HTTP and tool errors.
6. **Fallback rules** — when to escalate to the next layer, when to stop.

Skills depend on the **contract**, not on any particular implementation. Adding a new source (e.g. Linear, Toggl) means creating one new file in `references/`; no skill change.

### 4.3 Source / sink / aux classification

- **Source** connectors (produce normalized work events): `git`, `jira-activity`. Future: `calendar`, others.
- **Sink** connectors (accept normalized worklog writes): `tempo` (primary), `jira-worklog` (fallback).
- **Aux** connectors (utilities): `jira` (core search/CRUD, used by both `check-status` and the logging skills), `bamboohr`, `location`, `holidays`, `vacation-store`.

Naming inside `references/` is flat kebab-case (no `_` separators, no `_source/`/`_sink/` subdirs — the class is encoded in the SKILL.md index and each connector's `capabilities` section).

## 5. `log-work` skill

### 5.1 Invocation

```
/jira:log-work [date=today|YYYY-MM-DD] [target=8h] [lookback=7d] [project=KEY] [country=XX]
```

First positional token: `date` if it matches ISO-date, otherwise `project`. No arguments → `date=today`, `lookback=7d`, `target=8h`, `project` from memory `jira:last-project`.

### 5.2 Data shapes

**Work event** (produced by source connectors):

```json
{
  "date": "2026-04-24",
  "source": "git|jira-activity|...",
  "kind": "commit|status-change|comment|assignment|...",
  "issue_key": "PROJ-123" | null,
  "summary": "short human-readable text",
  "raw_weight": 1.0,
  "metadata": { ... source-specific ... }
}
```

**Worklog record** (consumed by sink connectors):

```json
{
  "issue_key": "PROJ-123",
  "date": "2026-04-24",
  "started_at": "2026-04-24T09:00:00+03:00",
  "duration_minutes": 120,
  "comment": "abc123: short summary"
}
```

### 5.3 Configuration

`${CLAUDE_PLUGIN_DATA}/log-work.json`:

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
  "lookback_default_days": 7,
  "day_start_local": "09:00"
}
```

Missing file → defaults above are used and the file is created on first successful run (atomic write via tmp+rename). Schema detail lives in `log-work/references/config-schema.md`.

### 5.4 Pipeline

Full per-phase flow lives in `log-work/references/pipeline.md`. Summary:

**Phase 0 — resolve context**
1. Capture `now` once (UTC) for all age / ordering / filename computations.
2. Resolve `project` from arg, else memory (`jira:last-project`), else prompt and save.
3. Resolve `country`: arg → memory (`jira:log-time:country`, plus `jira:log-time:country-detected-by`) → probe via `location` connector (OS region → locale env → timezone→country via bundled `tz-country.json` → ask user). Re-probe if memory is older than 30 days or `--redetect`.
4. Load config; merge with defaults.

**Phase 1 — catch-up scan**
1. Build the working-day set for `[now - lookback, now]`: drop weekends per `workdays`, drop public holidays via `holidays` connector (cached at `${CLAUDE_PLUGIN_DATA}/holidays-{country}-{year}.json`), drop days covered by vacation entries (read via `vacation-store` connector and, if available, merged with `bamboohr`).
2. For each working day, query the `jira` connector for this user's worklogs on that day; compute `logged_minutes`.
3. Classify: `full` (>= 99% of target, skipped), `partial`, `empty`.
4. Display the list of days needing attention, ascending. Prompt: accept all / pick specific dates / skip all.

**Phase 2 — per-day loop** (for each selected day)
1. Collect source events in parallel via enabled source connectors. `git` scans configured repos (default: current repo + any in `git_repos` config) for commits where `author.email == git config user.email` on that date, extracting issue keys via regex `[A-Z][A-Z0-9]+-\d+`. `jira-activity` runs a JQL bounded by the day for status changes, comments, and assignments on issues assigned to the user.
2. Group events by issue key (commits without a key get a pseudo-bucket `unassigned-<hash-prefix>`). Compute proposed hours per issue via normalized `raw_weight` (commit=1, comment=1, status-change=3, assignment=2), rounded to `step_minutes`, rescaled so the sum equals `target_hours`. Any rounding residue lands on the highest-weight issue.
3. Show the proposal: `Issue | Source hints | Proposed hours`. Enter interactive edit loop. Supported commands: `KEY=2h30m`, `+2h on KEY`, `-30m on KEY`, `rm KEY`, `add` (see 5.5), `accept`.
4. On `accept`, if `|total - target| > 5%`, warn once with `(a)ccept / (r)edistribute / (e)dit`. `r` rescales proportionally to reach exactly `target_hours`. `e` returns to the loop. `a` accepts as-is.
5. Ask for per-issue comments (default template: `<short-hashes>: <first-commit-summary-truncated-100>` when git events present; blank otherwise). Allow blanket edits.
6. Show dry-run summary. Require explicit `y` to proceed.
7. Write via the primary sink (`tempo`). On connector-level `unsupported` or probe miss, fall through to `jira-worklog`. Before each write, check the connector's listing of existing worklogs for that issue/day/author — if a record with identical `duration_minutes` and `comment` exists, skip it (idempotent re-run safety). Log any failures but continue with the remaining issues.
8. Per-day summary: `logged: [...]`, `remaining: 0 or Δ`, `skipped (idempotent): [...]`, `failed: [...]`.

**Phase 3 — final report**
- Table: `date | status (logged | skipped | partial-failed) | issues | total hours`.
- Trailing lines: `JQL: ...`, `Source: jira=<mcp|acli|cloud-rest|server-rest> sink=<tempo|jira-worklog>`, `Generated: <ISO-8601 UTC>`.

### 5.5 Ad-hoc task creation (`add` sub-flow)

1. Prompt: `Title?`.
2. Via `jira` connector: `search` with JQL `project = <project> AND summary ~ "<title tokens>" AND statusCategory != Done ORDER BY updated DESC`. Show top 5 candidates as `[1] PROJ-456 summary… (status, updated Xd ago)`.
3. User picks a number to reuse (done), or `new` to create.
4. `new` flow: prompt for issue type (default `Task`, validated against project's create-screen metadata), optional parent (skipped by default — user asked for standalone in sprint), create through `jira` connector into the active sprint with `assignee=currentUser()`, `labels=[auto_task_label]`.
5. Ask for hours, fold into the distribution, continue the edit loop.

### 5.6 Idempotency

Governed by `integrations/references/idempotency.md`. Key guarantees:

- `now` captured once at start, reused everywhere.
- Existing worklogs are source of truth. Skill never deletes or rewrites existing worklogs; it only adds.
- Auto-created issues carry the configured label (`auto-logged`) so the `add` search finds them on re-runs before creating duplicates.
- Config and holiday/vacation files are read atomically, written via tmp+rename.
- Stable sort keys and deterministic rounding rules ensure byte-identical output except for the `Generated:` line on repeat runs in the same state.

### 5.7 Error handling

- Jira connector unavailable → stop in Phase 0.
- BambooHR unavailable → warn, fall back to `vacation-store` only.
- Git repo not found → warn, skip git source for affected days.
- Rate-limited (429) → honor `Retry-After`, exponential backoff (1s, 2s, 4s; max 3 attempts) per connector spec; then stop with `Rate limited; retry later.`.
- 401/403 → `Auth failed for <source>. Check credentials.` No token echo.
- Partial Phase 2 failure → continue with remaining days; final report flags `partial-failed` rows.

## 6. `log-vacation` skill

### 6.1 Invocation

```
/jira:log-vacation [subcommand] [args]
```

Subcommands (default: `list`): `list`, `add`, `remove`, `sync`.

### 6.2 Store schema

`${CLAUDE_PLUGIN_DATA}/vacations.json`:

```json
{
  "version": 1,
  "entries": [
    {
      "id": "uuid-v4",
      "from": "2026-05-01",
      "to": "2026-05-14",
      "reason": "vacation|sick|holiday|other",
      "note": "string|null",
      "source": "local|bamboo|merged",
      "created_at": "2026-04-25T10:00:00Z",
      "updated_at": "2026-04-25T10:00:00Z",
      "external_ref": { "bamboo_id": "..." }
    }
  ]
}
```

Full schema (validation rules, migration path for `version` bumps) lives in `log-vacation/references/store-schema.md`.

### 6.3 Behavior

- **`list`** — read local store; if `bamboohr` connector is available, fetch periods in window `[now-90d, now+180d]` and merge. Conflicts (same date overlap, different reason) are annotated `⚠ conflict` rather than silently resolved. Render deterministic table: `id | from | to | days | reason | source | note`.
- **`add from=YYYY-MM-DD to=YYYY-MM-DD [reason=…] [note="…"]`** — validate (`from <= to`, `from >= now-1y`, `to <= now+2y`). Generate uuid. On overlap with an existing entry, prompt `(m)erge / (r)eplace / (c)ancel`. Atomic write.
- **`remove id=<uuid>|from=YYYY-MM-DD[,to=YYYY-MM-DD]`** — resolve target(s); on multiple matches show list and prompt to pick; require `y` confirm. Atomic write.
- **`sync`** — pull BambooHR (error if unavailable). Compute diff with local: `only-remote` → add tagged `source=bamboo`; `only-local` → keep; `both match` → no-op; `both differ` → prompt per conflict `(l)ocal / (r)emote / (m)erge`. Summary: `+N added, ~M updated, =K unchanged`.

### 6.4 Integration with `log-work`

`log-work` reads (never writes) `vacations.json` via the `vacation-store` connector during Phase 1 to exclude vacation days from the catch-up scan. Days with `reason=sick` are excluded from auto-logging in v1 (sickness is not logged to Jira).

### 6.5 Error handling

- Corrupt `vacations.json` → back up to `vacations.json.bak`, start fresh, warn user.
- Concurrent write protection: trivial file-lock `vacations.lock` (documented in schema; implementation is cooperative and single-user in v1).
- BambooHR rate-limit on `sync` → stop; local store untouched.

## 7. `check-status` refactor

Replace the inline "Prerequisite" (lines 10–22) and "Idempotency" (lines 242–249) sections of `check-status/SKILL.md` with references to `plugins/misc/skills/integrations/references/jira.md` and `.../idempotency.md`. No behavior change. This is the only change to an existing file in this design and is scoped to removing the duplication that the new shared connector doc makes redundant.

## 8. Plugin manifests

- `plugins/jira/.claude-plugin/plugin.json`: bump `version` to `0.2.0`, append `"time-tracking"`, `"worklog"`, `"vacation"` to `keywords`.
- `plugins/misc/.claude-plugin/plugin.json`: bump version as appropriate; add a keyword such as `"integrations"` if not already present.

## 9. Open questions (non-blocking for v1)

- Scheduled runs and session-close hook: deferred. When addressed, they should reuse `log-work` by invoking it through Claude's `schedule` skill or a `Stop` hook in global `settings.json`.
- Background draft generation: deferred. If added, drafts would live at `${CLAUDE_PLUGIN_DATA}/drafts/YYYY-MM-DD.json` and `log-work` would read and offer them before collecting sources live.
- Tempo-specific analytics and per-user rate limits: out of scope.

## 10. Out-of-scope extensions (examples)

These are explicitly listed to show the connector abstraction's leverage, not to commit to building them:

- Toggl / Clockify source connector.
- Linear as a source for issue-activity events (parallel to `jira-activity`).
- Calendar connector (Google Calendar, Outlook) for meeting-time attribution.
- Slack connector for activity signals.

Each is a new file in `plugins/misc/skills/integrations/references/` following `connector-pattern.md`; `log-work` picks it up once listed in `sources.enabled` or `sinks.primary/fallback`.
