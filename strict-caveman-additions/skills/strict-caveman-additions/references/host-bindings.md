# Host bindings

How each host loads the rules. One row per host.

| Host | Hook file | Session start | Every user prompt |
|---|---|---|---|
| Claude Code | `hooks/hooks.json` | `SessionStart` → `python3 "${CLAUDE_PLUGIN_ROOT}/hooks/inject.py" session` | `UserPromptSubmit` → `python3 "${CLAUDE_PLUGIN_ROOT}/hooks/inject.py" prompt` |

The session-start output is the rules text. The per-prompt output is a one-line reminder.
