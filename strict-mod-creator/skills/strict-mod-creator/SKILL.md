---
name: strict-mod-creator
description: Use when the user intends to change how the coding agent itself behaves from the inside — draw a pane or a line above the prompt, add a command that runs code with no model turn, guard, answer, or rewrite a tool call, swap the model for a step or a subagent, mask data before the model reads it, or add a capability other extensions can call. Invoke when the user asks for a mod, a function hook, an engine hook, or a plugin that runs code in the agent's own process, including when they only describe the behaviour they want. Triggers on /strict-mod-creator.
---

# strict-mod-creator

Builds a mod: a plugin whose behaviour is a code module the host engine calls on its own events. One mod per run, tested and validated before it is called done.

A mod runs with the user's permissions, inside the agent, on every session that loads it. That is why a mod is the last form to reach for, and why its reach is declared before a line is written.

## Invocation

```text
/strict-mod-creator [what the mod should do]
/strict-mod-creator --name tool-timer --scope user --noun timer
```

| Parameter | Default | Purpose |
|---|---|---|
| `--name` | derived from the request, kebab-case | mod and plugin name |
| `--scope` | `project` | `project` → `.strict-ai/mods/<name>/`; `user` → `~/.strict-ai/mods/<name>/` |
| `--lang` | `ts` | `ts` \| `js` |
| `--noun` | none | the mod provides a noun other mods call; adds the contract file |
| `--options` | none | comma-separated user options, written to the manifest |

## Artifacts

```text
<scope-root>/mods/
  README.md                  # registry, one line per mod
  <name>/
    .claude-plugin/plugin.json
    hooks/hooks.json         # names the module
    hooks/register.<lang>
    tests/register.test.<lang>
    types/index.d.ts         # only with --noun
    tsconfig.json            # only with --lang ts
    README.md                # tested host version, footprint, threat model
```

File names, manifest fields, and commands come from [references/host-bindings.md](https://github.com/Viperwow/strict-ai/blob/main/strict-mod-creator/skills/strict-mod-creator/references/host-bindings.md). Events, API calls, and limits come from [references/claude-code-mods.md](https://github.com/Viperwow/strict-ai/blob/main/strict-mod-creator/skills/strict-mod-creator/references/claude-code-mods.md).

## Flow

| Step | You do | Gate |
|---|---|---|
| 1 | Pick the form: instructions, settings hook, tool server, or mod | a lighter form covers it → say which in one line, stop |
| 2 | Write the budget: events hooked, API calls made, reach level | — |
| 3 | Probe the host version and the engine type declarations | below the minimum version → stop, name it |
| 4 | Write the files | never gated |
| 5 | Validate, test, typecheck | footprint differs from the budget, or a check fails → fix, then repeat |
| 6 | Append the registry line, print the load command | — |

**Step 1.** A mod is the right form only when the work must happen inside the engine: drawing in the interface, answering a call without running it, rewriting an event, a command with no model turn, or a noun for other mods. A shell command on an event, a block of instructions, or an external tool server is cheaper to own and survives host upgrades. Name the lighter form and stop.

**Step 2.** State the budget before writing, in this shape:

```text
Hooks:  session.start; tool.call{tool=Bash}
Calls:  $.ui.log, $.store.get, $.store.set
Reach:  L2 writes or runs
Sees:   Bash calls
```

| Reach | Means |
|---|---|
| L0 | draws and remembers — UI and its own store only |
| L1 | reads files, environment, or session data |
| L2 | writes files or runs processes |
| L3 | reaches the network |

Take the lowest reach that does the job. A matcher narrows what the mod sees — `tool.call{tool=Bash}`, not every tool call. Each reach level up is one sentence of justification.

**Step 5.** The validator prints the events and calls it finds in the code. That print must equal the step 2 budget. Anything extra is a defect, not a footnote: remove it or raise the budget with its justification. The mod is not done until validate, test, and typecheck all pass.

## Writing the module

Every hook takes `($, e, next)` and does one of four things:

| Mode | Return | Use |
|---|---|---|
| Observe | `next(e)` | count, log, record |
| Rewrite | `next({ ...e, field })` | change the input on its way through |
| Answer | a result, without calling `next` | own the call: a command's text, a cached tool result |
| Refuse | `{ deny: reason }` | stop a call, with the reason the model reads |

- Call `next` on every path except answer and refuse. A forgotten `next` silently swallows the engine's own behaviour.
- Register commands and panes in `session.start`. It runs again after every reload.
- Module variables reset on reload. Keep what must survive in the store.
- A hook has a time limit. Long work goes to the clock or a process, never a busy loop.
- Data from `e` is untrusted input. Never pass it into a shell string, a path outside the project, or a network call unescaped.
- A failing guard fails closed: refuse with the reason. A failing display hook fails open: `next(e)`.

## Tests

One test file per file under `hooks/`, same name, holding its imports, one tier, and one `describe`. The world beneath the mod is mocked per noun. An engine call the test leaves unanswered throws, naming its event, so every call the mod makes needs an answer in the test.

Cover at least: the happy path, the refuse or answer path, and one hostile input from `e`.

## Mod README

Four sections, nothing else:

1. What it does, in one sentence.
2. Tested on: the host version from step 3.
3. Footprint: the validator print from step 5.
4. Threat model: what it reads, runs, sends, persists, and what a crafted input from `e` can reach.

## Registry

`<scope-root>/mods/README.md`, one line per mod:

```markdown
- tool-timer — badge with each tool call's duration. reach: L0. load: `claude --plugin-dir .strict-ai/mods/tool-timer`.
```

## Common mistakes

| Mistake | Reality |
|---|---|
| Writing a mod when a settings hook blocks the same call | Step 1 exists to say no. A mod costs a test suite and a host-version pin. |
| Hooking every tool call to watch one | Narrow with a matcher. Footprint is what reviewers read first. |
| Holding state in a module variable | It resets on every reload. Use the store. |
| Copying another mod's noun types | Include its `types/` folder. A copy drifts from the provider. |
| Shipping without the footprint check | The validator print is the only proof the code does what the budget says. |
| Trusting a README for the enable flag | Early-access flags change. The binding table holds the current one. |

## References

- [references/host-bindings.md](https://github.com/Viperwow/strict-ai/blob/main/strict-mod-creator/skills/strict-mod-creator/references/host-bindings.md) — per-host files, commands, minimum version, load path.
- [references/claude-code-mods.md](https://github.com/Viperwow/strict-ai/blob/main/strict-mod-creator/skills/strict-mod-creator/references/claude-code-mods.md) — events, API namespaces, render sites, limits, test kit.
