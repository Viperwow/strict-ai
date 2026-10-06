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
    <manifest>              # host binding
    <module-pointer>        # host binding
    <hooks-module>          # selected language, host binding
    <test-file>             # host runner's supported format
    <type-contract>         # when required by the host
    <check-config>          # both JS and TS
    README.md                # tested host version, footprint, threat model
```

Read [references/host-bindings.md](https://github.com/Viperwow/strict-ai/blob/main/strict-mod-creator/skills/strict-mod-creator/references/host-bindings.md) before writing: it resolves file names, manifest fields, commands, supported test formats, approval, and activation for the current host. Read the API reference that binding names for event signatures, calls, and limits. No binding means stop; do not invent compatibility.

Scope chooses where the artifact is stored. It does not install or enable it in other projects. Follow the host's existing permission and activation rules; do not add a separate approval just because scope is `user`, and do not edit global settings unless the user requested activation there.

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
Hooks:  <events with their matchers>
Calls:  <API methods used>
Reach:  <level and justification>
Sees:   <input visible to the mod>
Persists: <storage scope and key ownership, or none>
```

| Reach | Means |
|---|---|
| L0 | draws and remembers — UI and mod-owned storage keys only; underlying storage may be shared |
| L1 | reads files, environment, or session data |
| L2 | writes files or runs processes |
| L3 | reaches the network |

Take the lowest reach that does the job. Use a matcher to narrow the input the mod sees. Each reach level up is one sentence of justification. Document whether storage survives reloads and sessions or is shared between projects. Namespace keys by mod and, when the value belongs to one project or session, by that scope as well. Reading another mod's data is outside L0.

**Step 5.** The validator prints the events and calls it finds in the code. That print must equal the step 2 budget. Anything extra is a defect, not a footnote: remove it or raise the budget with its justification. The mod is not done until validate, test, and the selected language's checks all pass. Use the host binding's JS and TS procedures, including its generated declarations and test discovery rules.

## Writing the module

Use the host binding's hook signature. Every hook does one of four things:

| Mode | Return | Use |
|---|---|---|
| Observe | pass the event onward | count, log, record |
| Rewrite | pass a copy with changed fields | change the input on its way through |
| Answer | a result, without forwarding | own the call: a command's text, a cached tool result |
| Refuse | the host's refusal result with a reason | stop a call, with the reason the model reads |

- Forward the event on every path except answer and refuse. Forgetting to forward silently swallows the engine's own behaviour.
- Register commands and panes on the host's session-start event. Account for registration after reloads.
- Module variables reset on reload. Keep what must survive in the store.
- A hook has a time limit. Long work goes to the clock or a process, never a busy loop.
- Event data is untrusted input. Never pass it into a shell string, a path outside the project, or a network call unescaped.
- A failing guard fails closed: refuse with the reason. A failing display hook fails open: forward the event.

## Tests

One test file per hooks source module, using the host runner's supported suffix even when the module is JS. The file holds its imports and one suite; set the execution tier if needed. Mock the world beneath the mod so no real command, network request, or persistent write runs in a test. Answer each engine call the mod makes.

Cover at least: the happy path, the refuse or answer path, and one hostile input from `e`.

## Mod README

Four sections, nothing else:

1. What it does, in one sentence.
2. Tested on: the host version from step 3.
3. Footprint: the validator print from step 5.
4. Threat model: what it reads, runs, sends, persists, storage sharing and key isolation, and what crafted event data can reach.

## Registry

`<scope-root>/mods/README.md`, one line per mod:

```markdown
- tool-timer — badge with each tool call's duration. reach: L0. load: <command resolved from the host binding>.
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
