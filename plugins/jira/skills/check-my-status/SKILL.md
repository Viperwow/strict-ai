---
name: check-my-status
description: Show current Jira issues assigned to the user, grouped by issue type (Epic → Story → Bug → Task → Sub-task → others) with in-progress rows pinned to the top. Use when the user runs `/jira:check-my-status`, asks "what am I working on", "show my jira", "my open tickets", "my current tasks", or similar status-of-my-work questions. Produces deterministic markdown tables so repeated runs are idempotent.
---

# check-my-status

Reports the user's currently assigned, not-done Jira issues as markdown tables, grouped by issue type and deterministically sorted so repeated runs produce byte-identical output when the underlying data is unchanged.

## Data source — strict priority order

Try in this order. Stop at the first that succeeds. If a higher-priority source fails mid-fetch (auth error, network error), do NOT silently fall through — report the error and stop, unless the user explicitly asked to retry with a fallback.

1. **Jira MCP server** — if any MCP tool named like `mcp__*jira*__*` or `mcp__*atlassian*__*` is available in the current session, use it. Prefer tools named `search`, `jql_search`, `issue_search`, or `myself`.
2. **Official Atlassian CLI** (`acli`) — run `acli --version` to probe. If present, use `acli jira workitem search --jql "<JQL>"` (or the equivalent issue-search subcommand for the installed `acli` version). Parse JSON output only (`--json` / `-o json`), never human text.
3. **Jira REST API via JQL** — `POST {JIRA_BASE_URL}/rest/api/3/search/jql` with Basic auth (`JIRA_EMAIL:JIRA_API_TOKEN` base64). Required env: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`. If any is missing, stop and ask the user to set them.
4. **Other fallbacks** — only if the user explicitly requested a specific alternative (e.g., `gh` issues mirror, exported CSV). Do not invent one.

Record which source was used in a final `> Source: <name>` line below the last table (see Output format).

## JQL

Three queries are issued per run. Run them in parallel when the source supports it.

**Q1 — open issues (main table data):**

```
assignee = currentUser() AND statusCategory != Done
```

Request these fields only: `summary`, `status`, `priority`, `issuetype`, `created`, `customfield_10020` (standard sprint field on Atlassian Cloud; if the instance uses a different sprint field, fall back to any field whose schema is `sprint`). No ordering in JQL — sorting is done locally for deterministic ties. If paginated, fetch all pages before rendering.

**Q2 — overall progress counts (two count-only queries):**

```
assignee = currentUser()
assignee = currentUser() AND statusCategory = Done
```

Use a count-only request (`fields=*none`, `maxResults=0`) so only `total` is returned — do not fetch issue bodies.

**Q3 — active-sprint progress counts (two count-only queries):**

```
assignee = currentUser() AND sprint in openSprints()
assignee = currentUser() AND sprint in openSprints() AND statusCategory = Done
```

If `openSprints()` is not supported by the backend (rare, Server < 8), fall back to filtering Q1 results locally by `sprint.state == "active"` and counting; for the done portion, additionally query `assignee = currentUser() AND statusCategory = Done` and filter its sprint field locally. Report which fallback was used as part of the `Source:` line (e.g. `rest-jql+local-sprint-filter`).

When the active sprint name is needed for the progress line, take it from any issue's `sprint` field where `state == "active"`. If multiple active sprints exist across the user's issues, join their names with `, ` sorted ASC.

## Grouping

Group issues by `issuetype.name`. Emit one table per non-empty group, in this fixed order:

1. Epic
2. Story
3. Bug
4. Task
5. Sub-task (also matches `Subtask`, `Sub Task` — normalize case-insensitively)
6. Any other type present in the result, sorted alphabetically (case-insensitive)

Skip groups with zero issues — do not render empty tables.

## Row sorting inside a group

Apply these keys in order (each key breaks ties of the previous):

1. **Status bucket** — rows whose `status.statusCategory.key == "indeterminate"` (i.e., "In Progress" category) come first; all others follow.
2. **Priority** — Highest → High → Medium → Low → Lowest → unknown. Unknown/missing priorities sort last.
3. **Age** — oldest first (largest age first).
4. **Issue key** — ASC, natural sort (`PROJ-2` before `PROJ-10`). This is the final tiebreaker and guarantees idempotency.

## Fields and formatting

| Column     | Source                                              | Format                                                                                                       |
| :--------- | :-------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `Key`      | `issue.key`                                         | Raw, e.g. `PROJ-123`                                                                                         |
| `Status`   | `issue.fields.status.name`                          | Exact Jira name. No translation, no emoji.                                                                   |
| `Priority` | `issue.fields.priority.name`                        | Exact Jira name. `—` if missing.                                                                             |
| `Age`      | floor((now - `issue.fields.created`) / 1 day)       | `Nd` (integer days, UTC). `0d` for same-day. Use `now` captured once at start of run — do not re-read clock. |
| `Sprint`   | active sprint from sprint field (state == `active`) | Sprint name. `—` if no active sprint. If multiple active sprints, join names with `, ` sorted ASC.           |
| `Summary`  | `issue.fields.summary`                              | Trimmed. Escape `\|` as `\\\|`. Collapse internal whitespace runs to a single space. Do not truncate.        |

Column order is fixed: `| Key | Status | Priority | Age | Sprint | Summary |`.

## Progress bars

Two text progress bars are rendered above the tables.

- **Overall**: ratio of Done issues to all issues assigned to the user (`done_total / all_total`).
- **Sprint**: ratio of Done to all issues assigned to the user in any currently active sprint (`done_sprint / all_sprint`).

Bar rendering rules (fixed — do not vary):

- Width: exactly **20 cells**.
- Fill character: `█` (U+2588). Empty character: `░` (U+2591).
- Filled cells = `floor(ratio * 20)`. No rounding — always floor, so only a 100% ratio fills all 20.
- Percent: `floor(ratio * 100)` (integer, trailing `%`).
- Counts: `(<done>/<total>)` with raw integers.
- Ratio when `total == 0`: render the line as `Overall: — (no assignments)` or `Sprint —: — (no sprint issues)` respectively; skip the bar entirely in that case.
- If no active sprint exists at all, render `Sprint —: — (no active sprint)` and skip the bar.

Exact line formats:

```
Overall: [████████░░░░░░░░░░░░] 40% (8/20)
Sprint <name>: [██████░░░░░░░░░░░░░░] 30% (3/10)
```

`<name>` is the active sprint name (or comma-joined names sorted ASC if multiple).

## Output format (exact template)

Render the report as markdown, in this exact structure. Nothing else — no preamble, no trailing prose.

```markdown
# My Jira — <N> open

Overall: [████████░░░░░░░░░░░░] 40% (8/20)
Sprint <sprint-name>: [██████░░░░░░░░░░░░░░] 30% (3/10)

## Epic (<n_epic>)

| Key | Status | Priority | Age | Sprint | Summary |
| --- | --- | --- | --- | --- | --- |
| PROJ-1 | In Progress | High | 12d | Sprint 42 | ... |
| ...    | ...         | ...  | ... | ...       | ... |

## Story (<n_story>)

| Key | Status | Priority | Age | Sprint | Summary |
| --- | --- | --- | --- | --- | --- |
...

> Source: <jira-mcp | acli | rest-jql | other:<name>>
> Generated: <ISO-8601 UTC timestamp, second precision>
```

Rules:

- Heading text is literal English as shown. Do not localize.
- `<N>` is the total across all rendered groups (open issues only).
- `<n_xxx>` is the row count of that group.
- The two progress lines (`Overall:` and `Sprint ...:`) always appear in this order, directly after the title, separated from the first group heading by exactly one blank line.
- Omit sections with zero rows.
- Use exactly three hyphens (`---`) per column separator — no alignment colons, no padding spaces beyond one on each side of each cell.
- Trailing `Source:` and `Generated:` lines are required. They are the only non-table lines after the last table.
- The `Generated:` timestamp is the same `now` captured at the start of the run, rendered as `YYYY-MM-DDTHH:MM:SSZ`.

## Idempotency guarantees

Two runs on the same underlying Jira state must produce byte-identical output except for the `Generated:` line. To ensure this:

- Fetch all pages before rendering.
- Capture `now` once; reuse for every age calculation and the `Generated:` line.
- Never use wall-clock-dependent ordering (no "recently viewed", no "my recent activity").
- Never inject random hints, emoji, or variable spacing.
- When a field is missing, always render `—` (em-dash, U+2014), never empty string, `N/A`, `null`, or similar.
- Normalize issue-type names before grouping (trim, case-fold) but render the canonical label (`Epic`, `Story`, `Bug`, `Task`, `Sub-task`, or the type's original name for "other").

## Error handling

- Missing env vars for REST fallback → stop, print: `Missing: <VAR_NAME>`. Do not attempt the request.
- HTTP 401/403 → stop, print: `Auth failed for <source>. Check JIRA_API_TOKEN.`.
- HTTP 4xx/5xx → stop, print status + response snippet. Do not fall through to the next source automatically.
- Zero matching issues → render `# My Jira — 0 open`, both progress lines (using their zero-state formats), and the trailing `Source:` / `Generated:` lines. No group headings, no tables.

## Notes for future extension

- If the user passes arguments (e.g., `/jira:check-my-status PROJ`), treat them as a project-key filter appended to JQL as `AND project = "<ARG>"`. Multiple args → `AND project in ("<A>","<B>")`.
- Do not add columns, emoji, colors, or sorting options without updating this file — the format contract is part of the skill.
