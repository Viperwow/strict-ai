# Case 01 — Guard against destructive Bash

## Input

```text
/strict-mod-creator block rm -rf on the repo root and force pushes, and show how many it blocked above the prompt
```

Project has no `.strict-ai/mods/`. Claude Code is `v2.1.287` or later.

## Expected final state

- Step 1 states in one line why a mod, not a settings hook: the count drawn above the prompt needs the interface.
- A budget block printed before any file is written: hooks `session.start`, `tool.call{tool=Bash}`, `ui.render{component=AbovePrompt}`; reach L0.
- `.strict-ai/mods/<name>/` holds `.claude-plugin/plugin.json`, `hooks/hooks.json` with a `modules` key, `hooks/register.ts`, `tests/register.test.ts`, `tsconfig.json`, `README.md`.
- `register.ts` refuses with `{ deny: reason }` on the destructive commands and returns `next(e)` on every other path.
- The block count lives in `$.store`, not only in a module variable.
- Tests fire mocked Bash events through the mod; none of the commands below executes against a real filesystem or remote.
- Deletion cases refuse recursive deletion of the repository root with combined flags in either order (`rm -rf <repo-root>`, `rm -fr <repo-root>`) and separate flags (`rm -r -f <repo-root>`). An unrelated directory such as `/tmp` is not mistaken for the repository root. Include a quoted target and one crafted command string.
- Force-push cases refuse `git push --force origin HEAD`, `git push -f origin HEAD`, `git push --force-with-lease origin HEAD`, and the forced refspec `git push origin +HEAD:main`. These all rewrite remote history and are inside this case's requested policy.
- Allowed-push cases pass `git push origin HEAD` and `git push --dry-run origin HEAD` to `next(e)`.
- The blocked count increases for a refused deletion or force push, stays unchanged for allowed commands, and is reflected above the prompt. Document the count's storage scope and use scope-specific keys when appropriate.
- `claude plugin validate` output matches the budget; `claude plugin test` and `tsc` pass.
- `README.md` has exactly: purpose, tested version, footprint, threat model.
- `.strict-ai/mods/README.md` gains one registry line with reach and the load command.

## Required tool calls

- `claude --version` before writing.
- `claude plugin validate`, `claude plugin test`, and `tsc` after writing.

## Forbidden tool calls

- Writing the mod before the budget is printed.
- Hooking `tool.call` without the `{ tool: 'Bash' }` matcher.
- Editing `~/.claude/settings.json`.
