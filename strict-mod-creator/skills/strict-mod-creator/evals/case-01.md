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
- Tests cover a refused command, an allowed command, and one crafted command string.
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
