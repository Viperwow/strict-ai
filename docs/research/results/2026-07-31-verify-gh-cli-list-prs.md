# Verify `gh` CLI can list PRs for this repo

- **id:** r-004
- **kind:** experiment
- **date:** 2026-07-31
- **status:** pass
- **tool:** `gh` (GitHub CLI)

## Hypothesis

`gh pr list` exits 0 and prints parseable PR rows (or an empty list) for Viperwow/strict-ai.

## Setup

- env: Linux · bash · `gh` 2.91.0 (2026-04-22)
- cwd: `/workspace`
- deps installed this run: none

## Procedure

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | `gh --version` | ok | exit 0; `gh version 2.91.0 (2026-04-22)` |
| 2 | `gh pr list --repo Viperwow/strict-ai --limit 5 --json number,title,state` | ok | exit 0; JSON array with 4 open PRs |

## Verdict

**pass.** `gh` is available in this cloud environment and can list PRs for `Viperwow/strict-ai` as JSON. Suitable as a read-only overnight experiment target and as a smoke check that GitHub auth works for automation runners.

## Evidence

```text
$ gh --version
gh version 2.91.0 (2026-04-22)
https://github.com/cli/cli/releases/tag/v2.91.0

$ gh pr list --repo Viperwow/strict-ai --limit 5 --json number,title,state
[{"number":16,"state":"OPEN","title":"feat(strict-labs): overnight research tasks automation"},
 {"number":15,"state":"OPEN","title":"docs: day orchestration stack design spec"},
 {"number":13,"state":"OPEN","title":"docs: add AGENTS.md with Cursor Cloud environment/run notes"},
 {"number":12,"state":"OPEN","title":"feat(strict-quality): AEVAL-style skill eval + Telegram digest sender"}]
```

## Implications for this repo

- Overnight experiment kind can rely on `gh` for read-only GitHub checks in this environment.
- Prefer `--json` in experiment steps for machine-checkable success criteria.

## Follow-ups

- none
