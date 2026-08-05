# Interview — requirement capture

Ask only what is missing from the invocation and session context. One topic at a time. Stop as soon as you can assemble the agent. Never assume on ambiguity — ask.

## Topics

1. **Role / task** — What is this agent for? One or two sentences.
2. **Inputs** — What does it receive to work on (a file, a diff, a ticket, a URL, free text)?
3. **Output artifact** — What must it produce (a summary, a file, a PR comment, a JSON blob)? What shape?
4. **Constraints / forbidden actions** — What must it never do (no network writes, no deletes, no external sends, read-only, etc.)?
5. **Success criteria** — How do we know an output is correct? Give one concrete, checkable signal. *These become the golden case (step 6).*
6. **Autonomy** — Which actions may it take automatically, and which need human confirmation?
7. **Capabilities / tools** — What does it need to touch (files, shell, web, a specific CLI or MCP)? Does it need an ephemeral `uvx`/`npx` tool?

## Turning answers into the agent

| Answer | Maps to |
|---|---|
| role/task | `description` + body role line |
| inputs / output | body Context + Output sections |
| constraints | body Constraints + `disallowedTools` / `permissionMode` |
| success criteria | the golden eval case |
| autonomy | `permissionMode`, and body guidance on when to stop and ask |
| tools | `tools` allowlist (+ `Bash` for `uvx`/`npx`), `skills` |

If success criteria stay vague after asking, push once more — a non-checkable criterion cannot become a golden case, and the mandatory eval step blocks the write without one.
