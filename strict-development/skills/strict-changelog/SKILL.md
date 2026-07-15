---
name: strict-changelog
description: Generate a keepachangelog-format changelog from the current branch's commits over a period (default last 7 days). Scopes changes by conventional-commit type and scope, collapses commits sharing a task-id into one linked line, and flags commits with no task-id. Also surfaces not-yet-merged work (open PRs/MRs and unmerged branches) under Unreleased, split into Pending and Drafts, with a conflict marker. Vendor-agnostic — resolves task and PR links via whatever integration is available, never hardcodes a tracker. Use when asked "what changed", to prepare release notes, or a changelog. Triggers on /strict-changelog.
---

# strict-changelog

Turn the current branch's commits into a keepachangelog changelog, scoped by conventional commits, each change linked to its task.

## Invocation

~~~text
/strict-changelog                    # default: last 7 days, current branch
/strict-changelog --since 2026-06-01 # from a date (inclusive)
/strict-changelog --from <commit>    # from a commit (exclusive)
/strict-changelog --branch <name>    # use <name> instead of the current branch
~~~

`--since` and `--from` are mutually exclusive. No argument → last 7 days.
`--branch <name>` is independent of the two above and combines with either. No
`--branch` → the branch currently checked out (`HEAD`).

## Authoritative sources

Do not rely on memorized format. At the start of each run, fetch these and derive the
current section set and parse grammar from them:

- keepachangelog (sections, ordering): <https://keepachangelog.com/en/1.1.0/>
- conventional commits (type/scope/subject grammar): <https://www.conventionalcommits.org/en/v1.0.0/>

If a fetch fails, fall back to `references/type-map.md` and the rules below.

## Pipeline

1. **Resolve branch, then range.** Resolved branch = `--branch <name>` if given, else
   the currently checked-out branch (`HEAD`). All git commands below run against the
   resolved branch, not necessarily literal `HEAD`.
   - no arg → `git log <resolved branch> --since="7 days ago"`
   - `--since <date>` → `git log <resolved branch> --since="<date>"`
   - `--from <commit>` → `git log <commit>..<resolved branch>`

2. **Collect.** For each commit read subject, body, and trailers:
   `git log <range> --format='%H%x00%s%x00%b%x00%(trailers:only)%x00'`

3. **Parse conventional commit.** Split subject as `type(scope): description`. A
   **non-conventional** subject (no `type`) has no scope; per `references/type-map.md`
   it's treated as **Changed**, with the whole subject as the slug.

4. **Map type → section.** Use the table in `references/type-map.md`. Dropped types
   (`docs`, `chore`, `test`, `build`, `ci`, `style`) are excluded.

5. **Resolve task-id.** Read the git **trailer** first (`Task:`, `Ref:`, `Refs:`), else
   the conventional **scope** if it holds an id. Trailer wins. No id → unresolved: the
   change keeps its section/scope with no task bracket at all (see
   `Unresolved task-id handling`).

6. **Collapse.** Within a section, commits sharing one task-id become **one line**. Slug
   from the task title if resolvable, else the most descriptive commit subject. If a
   task's commits map to different sections, keep it atomic per section: emit **one line
   per section** (the same task-id link repeats across sections — that duplication is
   fine).

7. **Resolve link.** If an integration is available this session (an MCP or skill that
   maps a task-id to a URL), use it. Otherwise ask the user **once** for the base URL
   pattern (e.g. `https://tracker/browse/{id}`) and apply it to all ids. Store nothing.

8. **Render.** Print to chat **inside a fenced ` ```markdown ` block** so the raw
   structure stays visible (not silently styled). Structure, top to bottom:
   - **Range artifact** (ours, not part of the keepachangelog contract) — one italic
     line: `_<start> … <end>_` for a date-based range, or `_Since commit: <commit-id>_`
     for `--from <commit>`.
   - **`## [Unreleased]`** — always printed, even with nothing under it. Holds
     `### Pending` and `### Drafts` (see `## Pending changes` below); each omitted
     individually if empty, but the `## [Unreleased]` heading itself is never omitted.
   - **`## [Released]`** — only when it has content. Holds the keepachangelog sections
     in canonical order. One bullet per change, with the conventional scope as a
     **bold inline prefix**: `- **<scope>:** <slug> [<link>]`. No scope → omit the
     prefix (plain `- <slug> …`). Prefix a breaking change with `**BREAKING** ` after
     the scope, per `references/type-map.md`. **Sort order:** within each section,
     items with a resolved task-id come first; items without one are sorted to the
     end of that same section's list — no separate `Unlinked` section anywhere.

## Line format

~~~text
- **<scope>:** <slug> [<task-id as md link>]
~~~

Scope is the conventional-commit scope, inline and bold. No scope → drop the prefix.

Example: `- **storage:** Streaming upload for large blobs [[PROJ-412](https://tracker/browse/PROJ-412)]`

A change with no resolvable task-id — same shape, bracket simply omitted, sorted to the
end of its section (see Render, step 8):

~~~text
- Bump lint config
~~~

## Unresolved task-id handling

No separate section anywhere for changes with no task-id — each stays in its own
section (`## [Released]`'s canonical sections, or `## [Unreleased]`'s `Pending`/
`Drafts`, per `## Pending changes` step 7), just sorted to the end of that section's
list so it's easy to spot. After both blocks render, run two ordered offers covering
every change with no resolved task-id, found in **either** block, each a clean yes/no:

1. "Create tasks for the changes with no task-id? (yes/no)" — **only offer this if a
   task-creation integration is available** this session; it comes first so data can be
   enriched before it lands in a file. On yes, use that integration to create the tasks,
   then re-render. If no such integration exists, skip the offer and say task creation
   can't be performed here, then continue to offer 2.
2. "Write the changelog to CHANGELOG.md? (yes/no)" — on yes, prepend the rendered
   section to `CHANGELOG.md` (create the file if absent).

## Pending changes (open PRs / unmerged branches)

Rendered under `## [Unreleased]`, above the commit-based `## [Released]` block (see
Render, step 8). Surfaces work that hasn't landed on the branch yet:

1. **Enumerate.** Base branch = the repo's default branch (e.g. `git symbolic-ref
   refs/remotes/origin/HEAD`), or the PR/MR integration's own base-branch resolution
   if it differs. List branches not yet merged into it (`git branch --no-merged
   <base>`, and `-r` for remote-tracking branches). If a PR/MR integration is
   available this session (e.g. GitHub or GitLab), also fetch open PRs/MRs targeting
   the base branch and match each to its head branch.
   **Exclude the resolved branch** (step 1 of the main pipeline — `HEAD`, or the
   `--branch <name>` override) — it's already fully covered by the sections above —
   **and any branch forked from it** (the resolved branch is an ancestor of the
   candidate branch's tip). This applies whatever the resolved branch is — a PR
   branch or the base branch itself.
2. **Drop declined.** A PR/MR closed without merging is excluded entirely — never
   rendered, in no section.
3. **Classify.**
   - Open PR/MR in **draft** state → `### Drafts` (own section, sibling to
     `### Pending`).
   - Everything else (no PR/MR at all, or an open non-draft PR/MR) → `### Pending`
     directly.
4. **Flag conflicts.** If the PR/MR is reported not mergeable (merge conflicts),
   append `⚠️` to the very end of that line — regardless of whether the line is under
   `Pending` or `Drafts`. No PR/MR integration, or no matching PR/MR → conflict status
   is unknown, no marker.
5. **Resolve task-id, scope, slug.** Same rules as the main pipeline (steps 3, 5): git
   trailer on the branch's own commits first, else conventional scope, else an id
   pattern in the branch name. Slug from the PR/MR title if available, else the most
   descriptive commit subject on the branch.
6. **Resolve PR/MR link.** A matching open PR/MR renders as `#<number>` linked to it.
   A branch with no PR/MR has no PR marker at all.
7. **Render.** Same line shape as the main sections: `- **<scope>:** <slug>
   [<task-id link>] (PR #<number>) ⚠️`, with each bracket/paren/marker present only
   when resolved:
   - No task-id resolved → omit `[...]`.
   - No PR/MR → omit `(...)`.
   - No conflict → omit `⚠️`.
   - No scope → omit the bold prefix, same as the main sections.
   - **Sort order:** within each of `### Pending` and `### Drafts`, items with a
     resolved task-id come first; items without one are sorted to the end of that
     same list. No separate `Unlinked` section for this block.
8. **Skip when empty.** No pending work → omit `### Pending` entirely. No drafts →
   omit `### Drafts` entirely. Never print an empty section header.

## Output

Print to chat only. The two offers above are the only writes, and only on explicit yes.

## Example

Input: `/strict-changelog`

Output:

~~~markdown
_2026-07-03 … 2026-07-10_

## [Unreleased]

### Pending
- **storage:** Streaming upload for large blobs [[PROJ-412](https://tracker/browse/PROJ-412)] (PR #45)
- **auth:** Refresh token rotation [[PROJ-420](https://tracker/browse/PROJ-420)] (PR #46) ⚠️
- Rework internal queue consumer (PR #47)

### Drafts
- **api:** New GraphQL gateway [[PROJ-470](https://tracker/browse/PROJ-470)] (PR #50)
- Rework caching layer (PR #51) ⚠️

## [Released]

### Added
- **storage:** Streaming upload for large blobs [[PROJ-412](https://tracker/browse/PROJ-412)]
- Retry backoff on cold start [[PROJ-419](https://tracker/browse/PROJ-419)]

### Fixed
- **monitoring:** Dropped p99 metric label [[PROJ-421](https://tracker/browse/PROJ-421)]
- Fix race condition on shutdown

### Changed
- Bump lint config
- Fix typo in readme
~~~

Then:
~~~text
Create tasks for the changes with no task-id? (yes/no)
~~~
(after that answer)
~~~text
Write the changelog to CHANGELOG.md? (yes/no)
~~~
