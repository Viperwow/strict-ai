---
name: strict-changelog
description: Generate a keepachangelog-format changelog from the current branch's commits over a period (default last 7 days). Scopes changes by conventional-commit type and scope, collapses commits sharing a task-id into one linked line, and flags commits with no task-id. Vendor-agnostic — resolves task links via whatever integration is available, never hardcodes a tracker. Use when asked "what changed", to prepare release notes, or a changelog. Triggers on /strict-changelog.
---

# strict-changelog

Turn the current branch's commits into a keepachangelog changelog, scoped by conventional commits, each change linked to its task.

## Invocation

~~~text
/strict-changelog                    # default: last 7 days
/strict-changelog --since 2026-06-01 # from a date (inclusive)
/strict-changelog --from <commit>    # from a commit (exclusive)
~~~

`--since` and `--from` are mutually exclusive. No argument → last 7 days.

## Authoritative sources

Do not rely on memorized format. At the start of each run, fetch these and derive the
current section set and parse grammar from them:

- keepachangelog (sections, ordering): <https://keepachangelog.com/en/1.1.0/>
- conventional commits (type/scope/subject grammar): <https://www.conventionalcommits.org/en/v1.0.0/>

If a fetch fails, fall back to `references/type-map.md` and the rules below.

## Pipeline

1. **Resolve range.**
   - no arg → `git log --since="7 days ago"`
   - `--since <date>` → `git log --since="<date>"`
   - `--from <commit>` → `git log <commit>..HEAD`
   Always scope to the current branch (`HEAD`).

2. **Collect.** For each commit read subject, body, and trailers:
   `git log <range> --format='%H%x00%s%x00%b%x00%(trailers:only)%x00'`

3. **Parse conventional commit.** Split subject as `type(scope): description`.
   A **non-conventional** subject (no `type`) goes straight to the `### Unlinked`
   section — skip section/scope grouping (steps 4 and 8) for it.

4. **Map type → section.** Use the table in `references/type-map.md`. Dropped types
   (`docs`, `chore`, `test`, `build`, `ci`, `style`) are excluded.

5. **Resolve task-id.** Read the git **trailer** first (`Task:`, `Ref:`, `Refs:`), else
   the conventional **scope** if it holds an id. Trailer wins. No id → mark `[???]`.

6. **Collapse.** Within a section, commits sharing one task-id become **one line**. Slug
   from the task title if resolvable, else the most descriptive commit subject. If a
   task's commits map to different sections, keep it atomic per section: emit **one line
   per section** (the same task-id link repeats across sections — that duplication is
   fine).

7. **Resolve link.** If an integration is available this session (an MCP or skill that
   maps a task-id to a URL), use it. Otherwise ask the user **once** for the base URL
   pattern (e.g. `https://tracker/browse/{id}`) and apply it to all ids. Store nothing.

8. **Render.** Print to chat **inside a fenced ` ```markdown ` block** so the raw
   structure stays visible (not silently styled). Emit the `## [Unreleased] — <start> …
   <end>` header from the resolved range, then keepachangelog sections in canonical
   order. One bullet per change, with the conventional scope as a **bold inline prefix**:
   `- **<scope>:** <slug> [<link>]`. No scope → omit the prefix (plain `- <slug> …`).
   Prefix a breaking change with `**BREAKING** ` after the scope, per
   `references/type-map.md`.

## Line format

~~~text
- **<scope>:** <slug> [<task-id as md link>]
~~~

Scope is the conventional-commit scope, inline and bold. No scope → drop the prefix.

Example: `- **storage:** Streaming upload for large blobs [[PROJ-412](https://tracker/browse/PROJ-412)]`

Unlinked change (no task-id) — same shape, `[???]` in place of the link:

~~~text
- Bump lint config [???]
~~~

## Unlinked handling

A **conventional** commit with no resolvable task-id is kept in its normal section and
scope with `[???]`. A **non-conventional** (typeless) commit has no section — it lives
only under `### Unlinked`. After the main body, print a `### Unlinked` section — a plain
list of every `[???]` change, no extra prose. Then run two ordered offers, each a clean
yes/no:

1. "Create tasks for the unlinked changes? (yes/no)" — **only offer this if a
   task-creation integration is available** this session; it comes first so data can be
   enriched before it lands in a file. On yes, use that integration to create the tasks,
   then re-render. If no such integration exists, skip the offer and say task creation
   can't be performed here, then continue to offer 2.
2. "Write the changelog to CHANGELOG.md? (yes/no)" — on yes, prepend the rendered
   section to `CHANGELOG.md` (create the file if absent).

## Output

Print to chat only. The two offers above are the only writes, and only on explicit yes.

## Example

Input: `/strict-changelog`

Output:

~~~markdown
## [Unreleased] — 2026-07-03 … 2026-07-10

### Added
- **storage:** Streaming upload for large blobs [[PROJ-412](https://tracker/browse/PROJ-412)]
- Retry backoff on cold start [[PROJ-419](https://tracker/browse/PROJ-419)]

### Fixed
- **monitoring:** Dropped p99 metric label [[PROJ-421](https://tracker/browse/PROJ-421)]

### Unlinked
- Bump lint config [???]
- Fix typo in readme [???]
~~~

Then:
~~~text
Create tasks for the unlinked changes? (yes/no)
~~~
(after that answer)
~~~text
Write the changelog to CHANGELOG.md? (yes/no)
~~~
