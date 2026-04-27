---
name: check-status
description: Show Jira issues (mine by default, configurable assignee) for the user's current sprint and recent history, grouped by issue type with blockers lifted to the top and status-colored rows. Produces deterministic markdown so repeated runs are idempotent, and emits the JQL used so the same view can be recreated directly in Jira. Use when the user runs `/jira:check-status`, asks "what am I working on", "show blockers", "my jira", "show my tickets", "current tasks", or similar status-of-work questions.
---

# check-status

Reports Jira issues for a given project/assignee/sprint window as deterministic markdown tables, grouped by issue type with a dedicated Blockers section at the top. Emits the JQL used so the user can open the same view in Jira.

## Prerequisite

Jira connector is described in `plugins/misc/skills/integrations/references/jira.md`. Use its probe order (MCP → acli → REST Cloud → REST on-prem), auth rules, and error taxonomy. Record the resolved layer in the trailing `Source:` line.

## Parameters

All parameters accept `key=value` form; the first bare token is interpreted as `project`.

| Param       | Default                                                                                                                         | Accepts                                                                     |
| :---------- | :------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------- |
| `project`   | **Required.** If memory key `jira:last-project` exists, use it silently. Else ask the user and stop until answered; save reply. | Jira project KEY (e.g. `PROJ`).                                             |
| `sprint`    | Current active sprint in `project`. If none, behaves as `none` and relies on `history`.                                         | Sprint id, sprint name, `active`, `all`, `none`.                            |
| `assignee`  | `me` (resolves to `currentUser()`).                                                                                             | Jira account id, email, or literal `me`.                                    |
| `history`   | Typical sprint length in `project`: median of `endDate − startDate` across the last 5 closed sprints. Unresolvable: `14d`.      | Duration `Nd` or `Nw` (e.g. `7d`, `2w`, `30d`).                             |
| `limit`     | `10`                                                                                                                            | Positive integer. Top-N per group after sort.                               |
| `issue-types` | `Epic,Story,Task,Bug,Sub-task` (Jira Cloud native set).                                                                       | Comma-separated list of issue-type names (case-insensitive), or `all` to include every type present in the result. Prefix an entry with `+` to add to the default list (e.g. `+Incident`), or with `-` to remove (e.g. `-Sub-task`). |
| `plain-link`| `false`                                                                                                                         | When true, adds a required `URL` column and drops markdown link in `Key`.   |
| `dashboard` | `false`                                                                                                                         | When true, go beyond the URL-only link: create a saved filter + personal dashboard with a Filter-Results gadget via MCP/CLI. Requires Atlassian MCP or `acli`. |

### Resolving `project` from memory

Lookup memory fact `jira:last-project`. If present, use without prompting. Otherwise prompt: `Which Jira project? (KEY, e.g. PROJ)` and stop. After the user answers (or passes the value explicitly), write/update the fact.

### Resolving typical sprint length

Call the board-sprints endpoint (`/rest/agile/1.0/board/{boardId}/sprint?state=closed`) for the project's primary board. Compute median of closed-sprint durations; fall back to `14d` if <2 closed sprints exist.

## Data queries

Three JQL bundles. Run in parallel where the chosen source supports it.

### Q1 — issues for the view

```
assignee = <assignee> AND project = <project>
AND (sprint in openSprints() OR updated >= -<history>)
AND statusCategory != Done
```

Fields: `summary`, `status`, `priority`, `issuetype`, `created`, `updated`, `duedate`, `labels`, `issuelinks`, `parent`, `customfield_10020` (sprint), `customfield_10021` (flagged, Cloud default).

If the instance uses a different sprint or flag custom-field id, detect via `GET /rest/api/3/field` by schema (`schema.custom == "...:sprint"` / `...:flagged"`). Cache the resolved id under `${CLAUDE_PLUGIN_DATA}/field-ids.json` keyed by `JIRA_BASE_URL`.

### Q2 — overall progress counts (count-only)

```
assignee = <assignee> AND project = <project>
assignee = <assignee> AND project = <project> AND statusCategory = Done
```

`fields=*none`, `maxResults=0`. Read `total` only.

### Q3 — sprint progress counts (count-only)

```
assignee = <assignee> AND project = <project> AND sprint in openSprints()
assignee = <assignee> AND project = <project> AND sprint in openSprints() AND statusCategory = Done
```

If `openSprints()` unsupported (very old Server), filter Q1 results locally by `sprint.state == "active"` and additionally query `assignee = ... AND statusCategory = Done` with the same local sprint filter. Note fallback in `Source:` line as `+local-sprint-filter`.

## Blockers

A row is a **blocker** when any of the following holds (order matters — first match determines `Blocked by` source):

1. Any `issuelinks` entry with `type.inward == "is blocked by"` whose linked issue has `statusCategory != Done` → `Blocked by` = markdown link to the first such linked issue (sorted by issue key ASC when multiple).
2. `customfield_10021` (flagged) is non-empty → `Blocked by` = `flag: <reason>` where reason is the flag text trimmed and whitespace-collapsed, or `flag: (no reason)` when empty.
3. `status.name` (case-insensitive) ∈ {`Blocked`, `On Hold`, `Waiting`, `Impediment`} → `Blocked by` = `status: <original status name>`.

`Since` value:
- For criterion 1: `floor((now − linked-issue.fields.created) / 1d)`.
- For criterion 2: `floor((now − issue.fields.updated) / 1d)` (flag-set time is not exposed; `updated` is the closest deterministic proxy).
- For criterion 3: `floor((now − issue.fields.statuscategorychangedate) / 1d)`; fall back to `updated` when absent.

Blockers are lifted into a dedicated top section **after progress bars but before all type groups**, across all types. They **remain** in their type group's table too — not removed, just duplicated for emphasis.

The Blockers section uses a trimmed column set focused on action. Sub-bucket the rows by due-date urgency. See `references/design.md` for column order, sub-bucket headings, color wrapping, and ANSI-strip fallback.

## Status colors

Colors and palette codes for statuses, blocker highlight, and health bars live in `references/design.md`.

## Grouping and sorting

### Group order (fixed)

1. **Blockers** — special top section, mixes types. Always rendered when blockers exist, regardless of `issue-types`.
2. Groups from the resolved `issue-types` list, **in the order given**. Defaults to `Epic, Story, Task, Bug, Sub-task` (Jira Cloud native set). Case-insensitive match; `Subtask` / `Sub Task` variants normalize to canonical `Sub-task`. Unknown names in the list are kept as-is and matched literally.

If `issue-types=all`, order is the default native list first, then any remaining types present in the result alphabetical (case-insensitive).

Types present in the result but absent from `issue-types` are omitted from the body and listed as a trailing `> N issue type(s) hidden: <comma-joined names>` note. Empty groups (no issues for a listed type) are skipped silently.

### Row sort inside any group

Primary key: **priority** (Highest → High → Medium → Low → Lowest → unknown last).

Within each priority, in order:

1. Current-sprint rows before non-sprint rows.
2. `updated` DESC.
3. In-progress bucket before others (`statusCategory == indeterminate` first, then `new`).
4. Issue key ASC (natural sort, e.g. `PROJ-2` before `PROJ-10`) — final deterministic tiebreaker.

For custom priority schemes (non-default names): if the instance returns unknown priority names, fetch `GET /rest/api/3/priority` once and rank by the returned order (ASC id or `sequence` when present), caching to `${CLAUDE_PLUGIN_DATA}/priority-order.json` per `JIRA_BASE_URL`.

### Top-N limit

After sorting, keep only the first `limit` rows per group. If truncated, append directly below the table: `> Truncated: <N_shown> of <N_total>; raise limit= for more.`

The Blockers section is **not** subject to `limit` — every blocker is always shown.

### Group health subtitle (per type group)

Compute and render a one-line subtitle directly under each `##` type heading (not under `## Blockers`) with a status-bucket distribution and optionally a cycle-time median. Logic:

- Bucket counts: iterate the group's issues (before `limit` truncation), group by `status.name`, keep only buckets with `count > 0`.
- Bucket order in the subtitle: `To Do`, `In Progress`, `In Review`, `Blocked`, then any remaining bucket names alphabetical (case-insensitive).
- Median cycle time: median of `(resolutiondate − created)` in days across closed issues of this type in the last 90d for this `project` + `assignee`, computed from a once-per-run auxiliary count-light query. Render the `— median cycle Nd` suffix only when ≥3 such issues exist; omit otherwise.
- Cache the 90d-closed sample per run so it is computed at most once per type group.

See `references/design.md` for the subtitle's exact visual format.

## Columns

Column lists, separator style, escaping, and per-cell format rules are defined in `references/design.md` — UI authority. The skill's job is to compute the value; the reference's job is to describe the rendering.

Logic-only items that belong here (not in the design reference):

- **Key** link target: `<JIRA_BASE_URL>/browse/<issue.key>`. Use markdown link unless `plain-link=true`.
- **Age** / **Updated**: integer-floor of `(now − created|updated)` in UTC days. `now` captured once at the start of the run and reused for every per-cell computation, the health bar thresholds, the `Generated:` timestamp, and the overdue check.
- **Due** overdue condition: `duedate < date(now)` AND `issue.statusCategory != done`.
- **Sprint** cell source: only sprint entries where `state == "active"`.
- **Labels** source: `issue.fields.labels` array, no further filtering.
- **Summary** truncation: split on whitespace; if >10 tokens, keep the first 10 and append `…`.
- **Blocked by** / **Since**: computation defined in the *Blockers* section above.
- **URL** column: full `<JIRA_BASE_URL>/browse/<key>`; required and never omitted when `plain-link=true`.

## Progress bars

Compute:

- `Overall` ratio from Q2: `done_total / all_total`. Zero-state when `all_total == 0`.
- `Sprint` ratio from Q3: `done_sprint / all_sprint`. Zero-state when `all_sprint == 0`; "no active sprint" state when Q3 returns no sprint entries at all.
- Sprint end date: read from the active sprint's `endDate` when present, for the `· ends YYYY-MM-DD (Nd)` suffix.
- Health color selection thresholds (for the bar characters only):
  - Critical: `ratio < 0.25` AND `(sprintRemaining / sprintLength) < 0.30`.
  - OK: `ratio > 0.75` AND `(sprintRemaining / sprintLength) > 0.50`.
  - Warning: every other case where a sprint exists.
  - No color when `sprint=none` / `sprint=all`.

All width, chars, percent/ratio formatting, zero-state text, and color escapes are in `references/design.md`.

## Pre-populated Jira link (primary) and dashboard setup (optional)

Two ways to reproduce this view in Jira. The link-only path is the default and requires no backend calls beyond Q1–Q3 already issued.

### 1. Link-only (default, no extra calls)

Build a clickable link to Jira Cloud's **Issue Navigator** with the JQL pre-filled. The user clicks, lands on the same rows, and can refine — `Save as` (filter) → `Add gadget → Filter Results` on any dashboard. This is the recommended flow; Atlassian does not expose a URL that pre-creates a dashboard.

URL shape (Cloud):

```
<JIRA_BASE_URL>/issues/?jql=<URL-encoded JQL>
```

URL shape (on-prem / DC, Jira 9.x+):

```
<JIRA_BASE_URL>/issues/?jql=<URL-encoded JQL>
```

(Same path on both; legacy `/browse/<project>?jql=…` also works on older Server instances.)

Encoding rules:

- Percent-encode per RFC 3986 — at minimum encode space (`%20`), `=` (`%3D`), `(` `)` (`%28` `%29`), `,` (`%2C`), `"` (`%22`), `<` (`%3C`), `>` (`%3E`), `#` (`%23`), `&` (`%26`), `+` (`%2B`).
- Do **not** encode `-`, `_`, `.`, `~`, letters, or digits.
- Do **not** wrap the JQL in surrounding quotes before encoding.
- Line-breaks inside the JQL are flattened to single spaces before encoding.

The link is rendered as a **named markdown link on a dedicated line directly below the title**, not in the trailing metadata block. Link-text construction and visual parts are in `references/design.md` (section *Open-in-Jira link*). The skill's job here is only to resolve the parameter values and feed them into the template.

### 2. Create filter + dashboard (optional, `dashboard=true`)

Only when the user explicitly passes `dashboard=true`:

1. Prefer **Atlassian MCP** — call its filter-create and dashboard-create / gadget-add tools if present.
2. Else use `acli` — `acli jira filter create …` and `acli jira dashboard create …` (subcommand names vary by `acli` version; probe `acli jira --help` and use whatever subcommands exist; otherwise stop with a clear message).
3. Else fall through to Cloud REST (`POST /rest/api/3/filter`, `POST /rest/api/3/dashboard`, `POST /rest/api/3/dashboard/{id}/gadget`).

Filter name: `check-status: <project> / <assignee>` (stable — re-runs update the existing filter by id saved in memory under `jira:saved-filter-id:<project>:<assignee>` rather than creating duplicates).

Dashboard name: `check-status: <project> / <assignee>`. Add one `Filter Results` gadget referencing the filter.

Emit the resulting dashboard URL as a trailing `> Dashboard: …` line. On any failure mid-chain, fall back to the link-only output and append `> Dashboard: failed — <reason>` — never crash the report.

## Output order (logic)

The skill emits sections in this fixed order. Visual/typographic details (spacing, separators, subtitle format) are in `references/design.md`.

1. Title line.
2. Named Open-in-Jira link.
3. `Overall:` progress line.
4. `Sprint …:` progress line.
5. `## Blockers (<n>)` — only when `n > 0`. Sub-buckets `### Overdue` / `### Due this week` / `### Later / no due date`, each skipped when empty.
6. One `## <Type> (<n>)` section per type in the order resolved from `issue-types`, skipping empty groups. Each includes the group-health subtitle and the rows table, with any per-group `> Truncated: …` note.
7. Trailing metadata block, in this exact order (each line optional where noted):
   1. `> N issue type(s) hidden: <comma-joined>` — only when the result contains types not in `issue-types`.
   2. `> Dashboard: <URL>` — only when `dashboard=true` was requested. On failure: `> Dashboard: failed — <reason>`.
   3. `> JQL: <verbatim Q1 JQL with all placeholders resolved>` — always present.
   4. `> Source: <atlassian-mcp | acli | cloud-rest | server-rest>[+modifiers]` — always present.
   5. `> Generated: <ISO-8601 UTC timestamp, second precision>` — always present.

Rules:

- `JQL:` must be pasteable into the Jira UI's advanced JQL editor verbatim.
- The Open-in-Jira link is always rendered, including in zero-result runs.
- The Blockers section, its sub-buckets, and the group-health subtitle are always computed from the full result set before `limit` truncation.

## Idempotency

This skill follows the rules in `plugins/misc/skills/integrations/references/idempotency.md`: single `now` capture, stable sort keys, `—` sentinel for missing values, atomic writes for any cached files. Two runs against identical Jira state produce byte-identical output except for the `Generated:` line.

## Error handling and security

- Missing `project` (no arg, no memory) → ask, stop.
- Missing env vars on the chosen source → print `Missing: <VAR_NAME>`, stop.
- 401 / 403 → print `Auth failed for <source>. Check credentials.` — never echo tokens.
- 429 → exponential backoff honoring `Retry-After`: 1s, 2s, 4s; max 3 attempts. Then stop with `Rate limited; retry later.`
- Other 4xx/5xx → print status + body truncated to 200 chars; stop.
- Zero matching issues → title with `— 0 open`, both progress lines in zero-state form, no tables, trailing `JQL:` / `Source:` / `Generated:` still required.
- Always mask any header or field containing `Authorization`, `JIRA_API_TOKEN`, `JIRA_PAT`, or `Bearer` in error output.
- Skill is strictly read-only — never call mutating Jira endpoints.
- Tokens are read from env or `acli` keyring. Never persist tokens to memory, plugin data, or on disk.

## Cloud vs on-prem

- **Cloud (first-class)**: API v3, Basic auth with email + API token, `nextPageToken` pagination, `customfield_10020` / `customfield_10021` defaults, `/rest/agile/1.0/board/.../sprint` for sprint-length detection.
- **On-prem / DC (secondary)**: API v2, PAT bearer auth, `startAt` pagination, custom-field id detection via `/rest/api/2/field`. Requires Jira 9.x+ for reliable JQL and Agile endpoints.

## Argument examples

- `/jira:check-status` — uses memory-backed project, current sprint, `me`, history=typical, limit=10.
- `/jira:check-status PROJ` — positional project override.
- `/jira:check-status project=PROJ sprint=active limit=25` — expanded view.
- `/jira:check-status sprint=none history=30d` — 30-day recent window regardless of sprint.
- `/jira:check-status assignee=alice@example.com` — someone else's queue.
- `/jira:check-status plain-link=true` — add URL column, drop markdown in Key.
- `/jira:check-status dashboard=true` — also create/refresh a saved filter and personal dashboard via MCP/CLI, print its URL.
- `/jira:check-status issue-types=Epic,Story` — only those two groups.
- `/jira:check-status issue-types=+Incident` — default set plus `Incident`.
- `/jira:check-status issue-types=-Sub-task` — default set minus `Sub-task`.
- `/jira:check-status issue-types=all` — every type present in the result.
