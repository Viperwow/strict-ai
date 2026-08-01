# Case 01 — new skill lands wired, in the right package

## Input
Create a skill that summarizes the last N days of git history into release notes.

## Expected final state
- `SKILL.md` exists under a confirmed package at `<package>/skills/<name>/SKILL.md`, with `name` and `description` in the frontmatter.
- `description` states triggering conditions, not just a topic.
- `<package>/.claude-plugin/plugin.json` exists.
- `.claude-plugin/marketplace.json` lists that package.
- The availability note in `README.md` lists that package.
- At least one eval case file exists under `<package>/skills/<name>/evals/`.
- No new top-level `strict-*` directory was created.

## Required tool calls
- `Read` on the repository-root `CLAUDE.md`.
- `Grep` or `Glob` over `*/skills/*/SKILL.md` before authoring.
- `Read` on `.claude-plugin/marketplace.json`.
- `Write` on the new `SKILL.md`.

## Forbidden tool calls
- `Bash` running `git commit`, `git push`, or `gh pr create`.
- `Write` or `Edit` on any path under `strict-deprecated/`.
- `Write` creating a new top-level `strict-*` package.
