# strict-changelog — Design

**Date:** 2026-07-10
**Package:** `strict-development`
**Artifact:** one agent skill (`SKILL.md` + `references/type-map.md`). No code — all logic lives in agent instructions.

## Purpose

Read the current branch's commits over a period and produce a changelog in
[keepachangelog](https://keepachangelog.com/en/1.1.0/) format, scoped by
[conventional commits](https://www.conventionalcommits.org/en/v1.0.0/). Each change
links to its task. Vendor-agnostic: the skill never hardcodes anything about
third-party trackers.

## Invocation

```
/strict-changelog                    # default: last 7 days
/strict-changelog --since 2026-06-01 # from a date (inclusive)
/strict-changelog --from <commit>    # from a commit (exclusive)
```

`--since` and `--from` are mutually exclusive. No arg → 7 days.

## Pipeline

1. **Collect** — `git log <range>` on the current branch. For each commit capture
   subject, body, and trailers.
2. **Parse conventional commit** — `type(scope): subject`. Non-conventional commits
   have no type/scope (see Unlinked handling).
3. **type → section** — mapping from `references/type-map.md`, user-overridable:

   | type | section |
   |------|---------|
   | `feat` | Added |
   | `fix` | Fixed |
   | `perf`, `refactor` | Changed |
   | removals (e.g. `remove`, `!` breaking that drops surface) | Removed |
   | `security` | Security |
   | deprecations (e.g. `deprecate`) | Deprecated |
   | `docs`, `chore`, `test`, `build`, `ci` | **dropped** (not user-facing) |

4. **task-id resolution** — read from git **trailer** first (`Task:`, `Ref:`,
   `Refs:`), else from the conventional **scope** if it holds an id. Trailer wins.
5. **Collapse** — commits sharing one task-id become **one line**. Slug taken from
   the task or the most descriptive commit subject.
6. **Link resolution** — if an integration is available in the session (MCP or
   skill that resolves task URLs), use it to build the link. Otherwise ask the user
   **once** for the base URL pattern. The skill stores nothing about the tracker.
7. **Group & render** — print to chat. keepachangelog sections; inside each section,
   group lines by conventional scope (`storage`, `monitoring`, …). No scope → `misc`.

## Line format

```
- <slug> [<task-id as md link>]
```

Example: `- Streaming upload for large blobs [[PROJ-412](https://…/PROJ-412)]`

Unlinked change (no task-id) — same shape, `[???]` in place of the link:

```
- Bump lint config [???]
```

## Unlinked commits (no task-id)

Commits with no resolvable task-id are **kept**, rendered in their normal section
and scope, with `[???]` in place of the link. After the main body, print a dedicated
`### Unlinked` section — a plain list of those changes, no extra prose. Then the skill
runs two ordered offers (each a clean yes/no, no decorative text):

1. Offer to create tasks for the `[???]` changes. (Comes first, so the data can be
   enriched before it lands in a file.)
2. Offer to write the changelog to `CHANGELOG.md`.

## Output

Print the changelog to chat only. Never write files automatically. The two offers
above are the only writes, and only on explicit yes.

## Example output

```markdown
## [Unreleased] — 2026-07-03 … 2026-07-10

### Added
**storage**
- Streaming upload for large blobs [[PROJ-412](https://…/PROJ-412)]
**misc**
- Retry backoff on cold start [[PROJ-419](https://…/PROJ-419)]

### Fixed
**monitoring**
- Dropped p99 metric label [[PROJ-421](https://…/PROJ-421)]

### Unlinked
- Bump lint config [???]
- Fix typo in readme [???]
```

## Files

```
strict-development/
  skills/
    strict-changelog/
      SKILL.md
      references/type-map.md
```

## Repo sync (guardrail 12)

`strict-development` currently has no skills and is absent from `marketplace.json`.
Adding this skill requires:
- add `strict-development` plugin entry to `.claude-plugin/marketplace.json`
- update the availability note in `README.md`

## Non-goals (YAGNI)

- No tracker-specific code, tokens, or config baked in.
- No automatic file writes.
- No release/versioning logic — only the change list.
- No cross-branch or tag-diff modes.
```
