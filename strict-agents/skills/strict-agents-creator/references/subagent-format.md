# Claude Code subagent format

A subagent is a markdown file: YAML frontmatter (config) + a body that becomes the subagent's **system prompt**. Claude Code discovers it from `.claude/agents/` (project, walking up from the working directory) or `~/.claude/agents/` (user), scanning both recursively. Identity comes only from the `name` field, not the filename or subfolder.

## Frontmatter fields

| Field | Required | Value / behavior |
|---|---|---|
| `name` | **yes** | Identifies the agent. Uses lowercase letters and hyphens, unique across the agents tree. |
| `description` | **yes** | Tells Claude when to delegate here, and drives auto-delegation. "Use proactively" / "Use after X" strengthens the trigger. |
| `tools` | no | Allowlists the tools the agent may call. Omitting it inherits every tool. |
| `disallowedTools` | no | Denies specific tools, subtracting them from the inherited or allowlisted set. Applies before `tools` resolves; a tool named in both is removed. |
| `model` | no | Pins the model: `opus`, `sonnet`, `haiku`, `fable`, a full id, or `inherit`. Defaults to `inherit`. |
| `skills` | no | Preloads skill content into the agent's context at startup. Takes a YAML list. |
| `mcpServers` | no | Connects MCP servers for this agent alone, keeping their tool descriptions out of the parent context. |
| `permissionMode` | no | Sets the permission stance: `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan`. |
| `maxTurns` | no | Caps how many agentic turns the agent takes. |
| `background` | no | Runs the agent as a background task when `true`. |

Also available, rarely needed: `memory`, `effort`, `isolation` (`worktree` gives the agent its own repo copy), `color`, `hooks`.

Keep the surface minimal (KISS): most agents need only `name`, `description`, `tools`, `model`, and often `skills`. Prefer `disallowedTools` on a few entries over a long `tools` allowlist.

## Three traps worth knowing

**A misspelled tool degrades the agent silently.** Claude Code refuses to launch only when *nothing* in `tools` resolves; otherwise it drops the unresolved entries and starts anyway. A typo'd `Grep` produces an agent that runs fine and quietly cannot search. Check spellings — the loud failure you might expect never comes.

**Pinning `model:` states intent, not a guarantee.** Resolution runs `CLAUDE_CODE_SUBAGENT_MODEL` → the per-invocation `model` parameter → this frontmatter → the main conversation. Frontmatter sits third, and a value outside the organization's `availableModels` allowlist gets skipped in favour of the inherited model. Pin it anyway; just do not treat it as a hard cost ceiling.

**Plugin subagents ignore three fields.** An agent distributed inside a plugin silently loses `permissionMode`, `mcpServers`, and `hooks`. Put an agent that needs them in `.claude/agents/` or `~/.claude/agents/` instead.

## `tools` — inherit vs restrict

- Omitting `tools` inherits every tool, including MCP tools and `Agent`, so the agent can spawn nested subagents.
- Listing `tools` restricts the agent to exactly those entries (`tools: Read, Grep, Glob, Bash`).
- Leave `Agent` out of an explicit allowlist to forbid nested spawning. `Agent(type, …)` narrowing applies to a main-thread agent launched with `claude --agent`; inside a subagent definition the type list has no effect.
- `disallowedTools` subtracts from the inherited set — reach for it to inherit-all-but-exclude. `mcp__<server>` removes a whole MCP server.
- `Bash` lets the agent run `uvx`/`npx` on demand — grant it whenever the agent needs an ephemeral CLI.
- `tools` names tools. `skills` preloads skills.

## Model guidance

- `opus` — handles heavy reasoning, architecture, and ambiguous multi-step work.
- `sonnet` — balances capability against cost. Pick it by default.
- `haiku` — runs narrow deterministic tasks cheaply and fast.
- `fable` — pick it only where you have measured it beating the alternatives on this task class.

Record a one-line rationale for the pick. Revisit the choice as stronger models land.

## Assembled-file template

```markdown
---
name: <lowercase-hyphen>
description: <when to delegate here — "Use proactively when ...">
tools: <Read, Grep, Glob, Bash, ...>
model: <opus|sonnet|haiku|fable>
skills:            # omit the field entirely when there are none
  - <skill-a>
  - <skill-b>
---

You are <role>. <One-line mission.>

## Context
<Fixed context the agent always needs.>

## Constraints
- <Forbidden action.>
- <Boundary.>

## Tools
- Run `uvx <tool>` / `npx <tool>` on demand for ephemeral CLIs; do not assume anything is pre-installed.

## Done when
- <Explicit stop criterion.>

## Output
<Required output shape.>
```

## The body is not a blank slate

The body becomes the agent's system prompt, and the agent does not receive the full Claude Code system prompt. It does load the CLAUDE.md hierarchy and a git-status snapshot, though — only the built-in Explore and Plan agents skip those, and no frontmatter field changes it.

So the body is not the only authority the agent hears. Write constraints that survive contact with project CLAUDE.md instead of assuming silence around them, and state the role, constraints, stop criteria, and output shape explicitly.
