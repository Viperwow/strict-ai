# Design & UI reference — `check-status`

All rendering, typography, color, and spacing rules for the skill live here. Logic (queries, routing, computations) stays in `../SKILL.md`. If a UI rule appears in both files, this file is authoritative.

## Typography

- Em-dash for missing values: `—` (U+2014). Never empty string, `null`, `N/A`.
- Middle-dot separator in named links, subtitles, and meta rows: ` · ` (U+00B7 with single spaces on each side).
- Ellipsis for truncation: `…` (U+2026), no trailing space.
- Horizontal block chars for progress bars: `█` (U+2588) filled, `░` (U+2591) empty.
- Escape `|` in any cell content as `\|`.

## Color palette (ANSI 256)

Emit as escape sequences wrapping the colored text only. Always reset after: `\x1b[0m`.

| Meaning                        | Escape              | Hex hint  |
| :----------------------------- | :------------------ | :-------- |
| Blocker (lifts any status)     | `\x1b[38;5;52m`     | `#5f0000` dark red |
| In Progress                    | `\x1b[38;5;33m`     | `#0087ff` blue     |
| Other `indeterminate` statuses | `\x1b[38;5;178m`    | `#d7af00` amber    |
| Done                           | `\x1b[38;5;34m`     | `#00af00` green    |
| To Do / `new`                  | `\x1b[38;5;244m`    | `#808080` grey     |
| Health: critical (bar)         | `\x1b[38;5;124m`    | `#af0000` red      |
| Health: warning (bar)          | `\x1b[38;5;214m`    | `#ffaf00` orange   |
| Health: ok (bar)               | `\x1b[38;5;34m`     | `#00af00` green    |

### ANSI-stripping fallback

When the renderer strips ANSI, blocker rows still need a visible marker. Prepend `!! BLOCKER ` to the Status cell **unconditionally** for every blocker row — redundant when color works, essential when stripped, and keeps output idempotent.

No textual fallback for non-blocker statuses; their colors are supplemental.

## Title

```
# <project> / <assignee> — <N_open> open
```

- Em-dash before count.
- `<assignee>` = `me` for default; literal value otherwise (email, account id).

## Open-in-Jira link (named)

Placed on the line directly below the title, no blank line between them. Markdown link, text auto-generated from the resolved parameters:

```
[<project> / <assignee> · <sprint-part> · <history-part> · limit=<N><types-part>](<URL>)
```

Parts:

- `<sprint-part>`: `Sprint <name>` / `sprints: <comma-joined>` / `sprint: all` / `sprint: none`.
- `<history-part>`: `history=<value>` — only when `sprint=none` or `sprint=all`; omitted otherwise.
- `<types-part>`: ` · types: <comma-joined>` — only when `issue-types` differs from the Cloud-native default; omitted otherwise.

Examples:

- `[PROJ / me · Sprint 42 · limit=10](…)`
- `[PROJ / alice@example.com · sprint: all · history=30d · limit=25 · types: Epic, Story](…)`
- `[PROJ / me · sprint: none · history=14d · limit=10](…)`

## Progress bars

- Width exactly **20** cells.
- Filled = `floor(ratio * 20)`; percent = `floor(ratio * 100)`.
- Line formats (always immediately under the Open-in-Jira link, separated from it by one blank line):
  - `Overall: [████████░░░░░░░░░░░░] 40% (8/20)`
  - `Sprint <name>: [██████░░░░░░░░░░░░░░] 30% (3/10) · ends 2026-05-07 (3d)`
- Sprint line suffix `· ends YYYY-MM-DD (Nd)` is appended when the sprint has an `endDate`. Omit when no active sprint.
- Zero-state (no bar rendered):
  - `Overall: — (no assignments)`
  - `Sprint <name>: — (no sprint issues)`
  - `Sprint —: — (no active sprint)`

### Health coloring of bars

Colors applied to the bar characters only (not percent or counts):

- **Critical** (`\x1b[38;5;124m`): `ratio < 0.25` AND sprint-remaining / sprint-total < 0.30.
- **OK** (`\x1b[38;5;34m`): `ratio > 0.75` AND sprint-remaining / sprint-total > 0.50.
- **Warning** (`\x1b[38;5;214m`): every other case with a sprint.
- No color when sprint is `none` / `all`.

## Tables

### Standard group column order

```
| Key | Status | Priority | Age | Updated | Due | Sprint | Labels | Summary |
```

### Blockers column order (trimmed, action-focused)

```
| Key | Status | Blocked by | Since | Due | Summary |
```

### Separator row

Three hyphens exactly, single-space padding, no alignment colons: `| --- | --- | ... |`.

## Cell formatting

| Cell         | Rule                                                                                                                 |
| :----------- | :------------------------------------------------------------------------------------------------------------------- |
| `Key`        | Default: `[PROJ-123](<JIRA_BASE_URL>/browse/PROJ-123)`. `plain-link=true` → bare `PROJ-123` + trailing `URL` column. |
| `Status`     | Exact Jira name, wrapped in palette color. Blocker override wins. Fallback prefix `!! BLOCKER ` for blockers.        |
| `Priority`   | Exact Jira name. `—` if missing.                                                                                     |
| `Age`        | `Nd`, integer floor of `(now − created)/1d` UTC. `0d` same-day.                                                      |
| `Updated`    | `Nd`, integer floor of `(now − updated)/1d` UTC.                                                                     |
| `Due`        | `YYYY-MM-DD`; prefix `!` when strictly earlier than date-portion of `now` and issue is not Done. `—` if missing.     |
| `Sprint`     | Active sprint name; multiple joined `, ` sorted ASC (case-insensitive). `—` if none.                                 |
| `Labels`     | Sorted ASC (case-insensitive), joined `, `. Escape `\|` per label. `—` if empty.                                      |
| `Summary`    | Trim, collapse internal whitespace to single space, escape `\|`, truncate to ≤10 words, append `…` when truncated.    |
| `URL`        | Full `<JIRA_BASE_URL>/browse/<key>` — only when `plain-link=true`.                                                   |
| `Blocked by` | Markdown link to linked issue `[PROJ-9](…)` / literal `flag: <reason>` / status label `status: <name>`. `—` if none. |
| `Since`      | `Nd` in the current blocked state. Integer floor of `(now − blocker-start)/1d` UTC.                                  |

## Section hierarchy

- `#` — page title, one per report.
- `##` — top-level sections: `Blockers`, each rendered issue type.
- `###` — sub-buckets inside `## Blockers` (due-urgency tiers).
- Subtitle line — plain text directly under a `##` heading, no heading level.

## Group health subtitle

One plain-text line directly under each `##` type heading (not under `## Blockers`), before the table:

```
Status: To Do: 2 · In Progress: 3 · In Review: 1 · Blocked: 0 — median cycle 4.3d
```

- List only non-zero status buckets.
- Bucket order: `To Do`, `In Progress`, `In Review`, `Blocked`, then any others alphabetical.
- `— median cycle Nd` suffix rendered only when ≥3 closed issues of that type exist in the last 90d. Em-dash separator.

## Blockers sub-buckets

Under `## Blockers (N)`, render three `###` sub-sections in this order; skip any that are empty:

```
### Overdue (N)
### Due this week (N)
### Later / no due date (N)
```

Row sort inside each sub-bucket unchanged (priority → current-sprint → updated DESC → in-progress bucket → key ASC).

## Spacing

- Exactly one blank line between every `##` section.
- No blank line between `##` heading and its health subtitle.
- One blank line between the subtitle and the table.
- No blank line between a table and its immediate per-group notes (`> Truncated: …`).
- One blank line before the trailing metadata block.

## Zero-state layout

```
# <project> / me — 0 open
[<project> / me · Sprint 42 · limit=10](…)

Overall: — (no assignments)
Sprint Sprint 42: — (no sprint issues)

> JQL: …
> Source: …
> Generated: …
```

No group sections, no blockers section, no sub-buckets.

## Decoration rules

- No emoji anywhere.
- No unicode decoration beyond `█`, `░`, `·`, `—`, `…`.
- All visual weight carried by color + textual prefix markers.
- Column separators never include alignment colons or multi-space padding.

## Full output example

Non-trivial case: 2 blockers (one overdue, one due this week), three rendered type groups, one group truncated, one additional unrendered type, `dashboard=true`. ANSI color escapes are shown inline for illustration; a renderer that strips them still produces legible output thanks to the `!! BLOCKER ` prefix.

```markdown
# PROJ / me — 11 open
[PROJ / me · Sprint 42 · limit=10](https://acme.atlassian.net/issues/?jql=assignee%20%3D%20currentUser%28%29%20AND%20project%20%3D%20PROJ%20AND%20%28sprint%20in%20openSprints%28%29%20OR%20updated%20%3E%3D%20-14d%29%20AND%20statusCategory%20%21%3D%20Done)

Overall: [██████░░░░░░░░░░░░░░] 30% (6/20)
Sprint Sprint 42: [████████░░░░░░░░░░░░] 40% (4/10) · ends 2026-05-07 (3d)

## Blockers (2)

### Overdue (1)

| Key | Status | Blocked by | Since | Due | Summary |
| --- | --- | --- | --- | --- | --- |
| [PROJ-17](https://acme.atlassian.net/browse/PROJ-17) | !! BLOCKER \x1b[38;5;52mBlocked\x1b[0m | [PROJ-9](https://acme.atlassian.net/browse/PROJ-9) | 6d | !2026-04-18 | Waiting on infra team for DB access … |

### Due this week (1)

| Key | Status | Blocked by | Since | Due | Summary |
| --- | --- | --- | --- | --- | --- |
| [PROJ-22](https://acme.atlassian.net/browse/PROJ-22) | !! BLOCKER \x1b[38;5;52mOn Hold\x1b[0m | flag: needs legal review | 2d | 2026-04-26 | Contract template change pending legal … |

## Epic (2)

Status: In Progress: 2

| Key | Status | Priority | Age | Updated | Due | Sprint | Labels | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [PROJ-3](https://acme.atlassian.net/browse/PROJ-3) | \x1b[38;5;33mIn Progress\x1b[0m | High | 47d | 1d | — | Sprint 42 | platform, q2-goals | Unified auth across services … |
| [PROJ-5](https://acme.atlassian.net/browse/PROJ-5) | \x1b[38;5;33mIn Progress\x1b[0m | Medium | 30d | 4d | 2026-06-30 | Sprint 42 | — | Migrate reporting pipeline to new warehouse |

## Story (5)

Status: To Do: 1 · In Progress: 3 · In Review: 1 — median cycle 4.3d

| Key | Status | Priority | Age | Updated | Due | Sprint | Labels | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [PROJ-11](https://acme.atlassian.net/browse/PROJ-11) | \x1b[38;5;33mIn Progress\x1b[0m | High | 5d | 0d | 2026-04-28 | Sprint 42 | backend | Add idempotency keys to payment endpoints |
| [PROJ-14](https://acme.atlassian.net/browse/PROJ-14) | \x1b[38;5;33mIn Progress\x1b[0m | Medium | 9d | 2d | — | Sprint 42 | frontend | Render new dashboard skeleton loading state |
| [PROJ-19](https://acme.atlassian.net/browse/PROJ-19) | \x1b[38;5;178mIn Review\x1b[0m | Medium | 12d | 1d | — | Sprint 42 | frontend, review | Refactor navigation sidebar for mobile breakpoints … |
| [PROJ-23](https://acme.atlassian.net/browse/PROJ-23) | \x1b[38;5;33mIn Progress\x1b[0m | Low | 4d | 0d | — | Sprint 42 | — | Add telemetry for feature flag evaluations |
| [PROJ-8](https://acme.atlassian.net/browse/PROJ-8) | \x1b[38;5;244mTo Do\x1b[0m | Low | 19d | 7d | — | Sprint 42 | — | Document the on-call rotation handoff … |

## Bug (12)

Status: To Do: 4 · In Progress: 6 · Blocked: 2 — median cycle 2.1d

| Key | Status | Priority | Age | Updated | Due | Sprint | Labels | Summary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [PROJ-17](https://acme.atlassian.net/browse/PROJ-17) | !! BLOCKER \x1b[38;5;52mBlocked\x1b[0m | Highest | 6d | 0d | !2026-04-18 | Sprint 42 | backend, urgent | Waiting on infra team for DB access … |
| [PROJ-22](https://acme.atlassian.net/browse/PROJ-22) | !! BLOCKER \x1b[38;5;52mOn Hold\x1b[0m | High | 2d | 0d | 2026-04-26 | Sprint 42 | legal | Contract template change pending legal … |
| [PROJ-31](https://acme.atlassian.net/browse/PROJ-31) | \x1b[38;5;33mIn Progress\x1b[0m | High | 3d | 0d | — | Sprint 42 | backend | Retry storm in worker when queue is empty |
| [PROJ-34](https://acme.atlassian.net/browse/PROJ-34) | \x1b[38;5;33mIn Progress\x1b[0m | Medium | 7d | 1d | — | Sprint 42 | frontend | Date picker off-by-one on DST boundary |
| [PROJ-36](https://acme.atlassian.net/browse/PROJ-36) | \x1b[38;5;33mIn Progress\x1b[0m | Medium | 10d | 3d | — | Sprint 42 | backend | 500 on empty search string |
| [PROJ-38](https://acme.atlassian.net/browse/PROJ-38) | \x1b[38;5;33mIn Progress\x1b[0m | Medium | 11d | 2d | — | Sprint 42 | — | Email templating loses trailing newline |
| [PROJ-40](https://acme.atlassian.net/browse/PROJ-40) | \x1b[38;5;33mIn Progress\x1b[0m | Low | 5d | 1d | — | Sprint 42 | — | Spinner flashes briefly on cached data |
| [PROJ-41](https://acme.atlassian.net/browse/PROJ-41) | \x1b[38;5;33mIn Progress\x1b[0m | Low | 8d | 4d | — | Sprint 42 | — | Avatar wrong on profile page after rename |
| [PROJ-44](https://acme.atlassian.net/browse/PROJ-44) | \x1b[38;5;244mTo Do\x1b[0m | Medium | 6d | 5d | — | Sprint 42 | — | Logs missing trace id on auth path |
| [PROJ-45](https://acme.atlassian.net/browse/PROJ-45) | \x1b[38;5;244mTo Do\x1b[0m | Low | 4d | 4d | — | Sprint 42 | — | Tooltip overflow on narrow viewport |

> Truncated: 10 of 12; raise limit= for more.

> 1 issue type(s) hidden: Spike
> Dashboard: https://acme.atlassian.net/jira/dashboards/10042
> JQL: assignee = currentUser() AND project = PROJ AND (sprint in openSprints() OR updated >= -14d) AND statusCategory != Done
> Source: atlassian-mcp
> Generated: 2026-04-23T18:05:12Z
```

### What this example demonstrates

- Title + named Open-in-Jira link on the very first two lines (no blank between them).
- Progress bars immediately beneath (including `· ends YYYY-MM-DD (Nd)` sprint suffix).
- Blockers section appearing **before** type groups, lifted with `!! BLOCKER ` prefix + dark-red status wrap. The same tickets also appear in their type group (see `Bug` rows `PROJ-17` and `PROJ-22`).
- Blockers sub-buckets by due-urgency; empty sub-buckets omitted (no `### Later / no due date` because no such blocker exists).
- Trimmed Blockers column set (`Key | Status | Blocked by | Since | Due | Summary`) vs full 9-column layout on type groups.
- Group-health subtitle beneath each `##` type heading; median-cycle suffix appears only where ≥3 closed issues in 90d (visible on Story and Bug, absent on Epic).
- `Bug` group truncated by `limit=10` → per-group `> Truncated: …` line directly under the table, no blank line.
- One issue type (Spike) not in `issue-types` → `> N issue type(s) hidden: …` in trailing metadata.
- `dashboard=true` path: `> Dashboard: <URL>` appears before `> JQL:`.
- Trailing block order: Truncated (per-group) → hidden types → Dashboard → JQL → Source → Generated.
