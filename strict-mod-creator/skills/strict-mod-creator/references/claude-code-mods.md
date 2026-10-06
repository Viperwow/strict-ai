# Claude Code mods API

Snapshot of the API for Claude Code `v2.1.287`. Mods are early access; the declarations `/plugin-types` writes for the installed version win over this file.

Source: <https://code.claude.com/docs/en/plugins/mods/reference> and <https://github.com/anthropics/claude-code/tree/main/mods>.

## The hook

```ts
import type { On, PluginOptions } from 'claude-code'

export function register(on: On, options: PluginOptions): void {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    return next(e)
  })
}
```

This example only forwards Bash calls; it is not a deletion guard. A deletion policy needs command-aware option and target parsing, path resolution, and an explicit rule for commands it cannot interpret. A substring regex is insufficient: test option order (`-rf`, `-fr`), separate flags, quoting, command chains, and the distinction between `/` and `/tmp`. A filesystem-root policy differs from a repository-root policy; test the requested boundary without executing deletion commands.

| Argument | Meaning |
|---|---|
| `$` | the mods API, every call written in full: `$.fs.read(...)` |
| `e` | the event input, deeply frozen; change it by passing a copy to `next` |
| `next(e)` | the hooks after this one, then the engine; resolves to the result |
| `next.signal` | aborts when the event is abandoned |
| `next.origin` | `{ plugin, tier }` of whoever fired the event |
| `next.budget` | `ms` and `remainingMs` of the hook's time limit |
| `.catch(handler)` | error handler; `next.error.kind` is `throw` or `timeout` |

The second argument of `on` is an optional matcher on the event's fields: `{ tool: 'Bash' }`, `{ command: 'tally' }`, `{ component: 'Spinner' }`. Hooks on `turn.step` and `process.spawn` are async generators.

## Events

| Group | Event | A hook can return |
|---|---|---|
| Tools | `tool.call` | `next(e)`, `{ deny }`, `{ result }` |
| | `tool.check` | `{ decision }`: `allow`, `ask`, `deny` |
| | `tool.describe` | `{ description }` |
| Prompts | `prompt.submit` | `next({ ...e, text })`, `next({ ...e, context })`, `{ drop }` |
| | `prompt.compose` | `{ sections }` |
| | `prompt.section` | `{ text }`, `{ text: null }` to omit |
| | `prompt.context` | `{ blocks }`; instruction files arrive in `e.instructionFiles` |
| | `prompt.attachment` | `{ text }`, `{ text: null }` |
| | `prompt.fill`, `prompt.suggest`, `prompt.edit` | `next(e)` with changed text |
| | `skill.prompt` | `{ text }` |
| | `attribution.text` | `{ text }` |
| Commands | `command.run` | `{ text }`, `{}`, `next(e)` |
| | `command.describe` | `{ description, argumentHint, isHidden }` |
| | `config.set` | `next({ ...e, value })`, `{ deny }` |
| | `config.describe` | `{ label, description, isHidden }` |
| Turns | `turn.start` | `next(e)` |
| | `turn.step` | `yield* next(e)`, `next({ ...e, model })`, `next({ ...e, effort })` |
| | `turn.complete` | `next(e)`, `{ text }` under the answer |
| Session | `session.start` | `next(e)`; runs again after each reload |
| | `session.end` | `next(e)`; all `session.end` hooks share 1.5 s |
| | `session.compact` | `{ skip }` |
| | `session.append` | `next({ ...e, message })` |
| | `session.receive`, `session.send` | `{ consumed }`, `{ isDelivered: false, reason }` |
| | `session.measure` | `next(e)` |
| Subagents | `agent.offer` | `{ isOffered: false }` |
| | `agent.spawn` | `{ model }`, `{ deny }` |
| Interface | `ui.render` | the element tree for the site |
| | `ui.press`, `ui.input`, `ui.select`, `ui.message`, `ui.close`, `ui.focus`, `ui.scroll` | `next(e)` |
| Other mods | `plugin.register` | `{ refuse }` |
| | `engine.create` | a changed `$`: add or withhold a noun |
| Telemetry | `telemetry.log`, `telemetry.mark` | `next(e)`, `{ deny }`; needs matcher `{ to: 'collector' }` |
| Settings hooks | `classic.<Event>`, such as `classic.PreToolUse` | `e` is the hook's stdin JSON |
| API calls | every `$` method by name, such as `fs.read` | `next(e)`, `{ deny }`, `{ value }` |

## API namespaces

| Namespace | Methods |
|---|---|
| `$.plugin` | `name`, `root` |
| `$.ui` | `resolve`, `invalidate`, `open`, `close`, `panes`, `focus`, `scroll`, `toast`, `status`, `log`, `notice`, `ask`, `copy`, `blit` |
| `$.command` | `register`, `run`, `list` |
| `$.tool` | `register`, `call`, `check`, `list` |
| `$.agent` | `register`, `spawn`, `list` |
| `$.model` | `complete`, `fork`, `classify` |
| `$.prompt` | `submit`, `read`, `fill`, `suggest`, `compose` |
| `$.turn` | `abort` |
| `$.session` | `messages`, `cwd`, `root`, `model`, `turns`, `id`, `repo`, `surfaces`, `usage`, `version`, `compact`, `send`, `append`, `authorize` |
| `$.config` | `list`, `set` |
| `$.settings` | `read` |
| `$.env` | `get`, `set` |
| `$.fs` | `read`, `write`, `list`, `exists`, `stat`, `ancestors`; `write` is not atomic |
| `$.store` | `get`, `set`, `delete`, `keys`; persisted per plugin, shared by that plugin's sessions across projects; scope project/session values in their keys |
| `$.state` | `get`, `set`; helpers `atom`, `read`, `update`, `derive`, `memberOf` from `claude-code` |
| `$.clock` | `now`, `sleep`, `after`, `every` |
| `$.http` | `fetch` |
| `$.process` | `run`, `spawn` |
| `$.mcp` | `call`, `connect` |
| `$.audio` | `play`, `speak` |
| `$.telemetry` | `log`, `mark` |

## Render sites

`Pane`, `AbovePrompt`, `UserMessage`, `AssistantMessage`, `ToolUse`, `CommandOutput`, `AskUserQuestion`, `ToolProgress`, `Spinner`, `TurnDuration`, `InfoNotice`, `SessionMode`, `PromptHint`. `e.surface` is `terminal` or `desktop`.

## Limits

| Limit | Value |
|---|---|
| A hook's own time per event | 10 s |
| A `.catch` handler | 1 s |
| `$.process.run` | 30 s default, 10 min max |
| `$.model.complete` `maxTokens` | 1024 default |
| `$.fs.read`, `$.fs.write` | 4 MiB per file |
| `$.store` | 4 MiB of JSON in total |
| `$.ui.invalidate` redraws | 10 per second |
| Command, tool, subagent, pane names | letters, digits, `_`, `-`; up to 64 characters |
| One test | 5 s unless it sets `timeoutMs` |

## Test kit

```ts
import { describe, expect, mock, test, tier } from 'claude-code/testing'

tier('builtin')

describe('register', () => {
  test('outside a git repository /diff says so, opens nothing', async ($, on) => {
    const opened: string[] = []
    mock.clock(on)
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    on('process.run', () => ({
      value: { exitCode: 128, stdout: '', stderr: 'fatal: not a git repository' },
    }))
    on('ui.open', ($, e, next) => {
      opened.push(e.id)
      return next(e)
    })

    await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
    const { text } = await $.command.run({ command: 'diff', args: '', origin: { kind: 'composer' } })

    expect(text).toContain("isn't in a git repository")
    expect(opened).toEqual([])
  })
})
```

The example is the official one from `mods/diff`. An installed mod uses the tier it loads in, usually `user`.

- `$` is the engine's own; each call goes through every hook of the mod as it ships.
- Hooks the test registers with `on` sit beneath the mod. An engine call they leave unanswered throws, naming its event.
- `mock.env(on, vars)`, `mock.store(on, entries)`, `mock.clock(on)` answer the world from memory; `clock.advance(ms)` resolves waits, `clock.settle()` lets a dispatch run before it answers.
- `$.ui.press({ plugin, key })` presses a rendered `Button`.
- Shared test data lives in `tests/fixtures/`, one export per file.

## Noun contract

A mod that adds a noun in `engine.create` owns its types in `types/index.d.ts`: no imports, the exported types named after the noun, and the noun declared on `EngineInterface` in `claude-code`. Set the manifest's `types` field to `types/index.d.ts` so the host includes the contract. This field is also needed when declaring `PluginState` for `$.state`, even without a new noun; otherwise omit it. Its own hooks import from `../types`. A mod calling the noun declares the provider dependency and uses its generated types, or includes the provider's types folder without copying it; its tests seat an inline provider that adds the noun.
