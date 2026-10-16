# Host bindings

Where each host keeps the session source. One row per host. Use the first source that resolves.

| Host | Transcript | Session memory store |
|---|---|---|
| Claude Code | `~/.claude/projects/<project-slug>/<session-id>.jsonl` | `context-mode` (`ctx_search`), when installed |

- `<project-slug>` is the working directory with `:`, `\`, and `/` replaced by `-`.
- When the session id is unknown, skip the transcript; another session may own the newest file.
- The transcript keeps every message verbatim after context compaction.
- Quotes taken from a session memory store carry `source: <store>`.
