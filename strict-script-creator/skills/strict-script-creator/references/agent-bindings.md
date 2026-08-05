# Agent bindings

`SKILL.md` states capabilities, never mechanisms. The mechanisms live here as data. A new agent is a new row; the body of `SKILL.md` never changes for it.

| Agent | Detect | Session log | Catalog event | Counter event | Permission file |
|---|---|---|---|---|---|
| Claude Code | `$CLAUDE_PLUGIN_ROOT` set, or `~/.claude` exists | `~/.claude/projects/*/*.jsonl` | `SessionStart` | `UserPromptSubmit` | `.claude/settings.local.json` |
| anything else | no row matched | — | — | — | — |

The catalog event puts the registry in context once per session. The counter event reports a turn heavy with executed commands.

## Permission entry format

| Agent | Entry | Written to |
|---|---|---|
| Claude Code | `"Bash(node .strict-ai/scripts/demo-report.mjs:*)"` in `permissions.allow` | `.claude/settings.local.json` |

`settings.local.json`, not `settings.json`: permissions granted by automation are personal and untracked, not something that arrives in a teammate's checkout through a merge.

## Degradation

Behaviour degrades in two steps. Name the step you are on.

1. **Session log reachable** — repetition detection, invocation counts, autonomous removal.
2. **No session log** — the agent is unknown, or it simply has no log. Same outcome either way: create and cleanup both work, usage cannot be measured, so autonomous removal is off and every candidate goes to the human.

Neither step breaks the skill; only the automation differs. The events are conveniences, never dependencies — without the catalog event the registry is one read away, and without the counter event the user and the model still open the same flow.

While this stays a short table it belongs here. If it grows logic rather than rows, it moves to `strict-adapters`.
