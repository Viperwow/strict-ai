# Host bindings

One row per host that loads mods. A new host is a new row; the skill does not change.

Sources: <https://code.claude.com/docs/en/plugins/mods/create>, <https://code.claude.com/docs/en/plugins/mods/reference>, <https://code.claude.com/docs/en/plugins/mods/test>. Checked 2026-10-06; installed-version declarations take precedence.

API reference: [references/claude-code-mods.md](https://github.com/Viperwow/strict-ai/blob/main/strict-mod-creator/skills/strict-mod-creator/references/claude-code-mods.md).

| Field | Claude Code |
|---|---|
| Minimum version | `v2.1.287` — check with `claude --version` |
| Enable flag | none; mods are on by default. `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` is ignored from this version |
| Manifest | `.claude-plugin/plugin.json` — `name`, `version`, `description`, `author`; options in `userConfig`. Set `"types": "types/index.d.ts"` when adding a noun (`--noun`) or declaring reactive `PluginState`; otherwise omit it |
| Module pointer | `hooks/hooks.json` — `{ "description": "...", "modules": ["./register.ts"] }`. The `modules` key makes the plugin a mod |
| Entry | `export function register(on, options)` |
| Type declarations | loading or reloading a development mod writes `.claude-plugin/types/`, including `tsconfig.json`; `/plugin-types` also exports declarations. Use those for the installed version; import with `import type { On, PluginOptions } from 'claude-code'` |
| Test kit | `import { describe, expect, mock, test, tier } from 'claude-code/testing'` |
| Validate | `claude plugin validate <dir>` — prints hooks and calls |
| Test | `claude plugin test <dir>` |
| Test discovery | `.test.ts` or `.test.tsx` for both JS and TS modules; use `tests/register.test.ts` for `hooks/register.js` or `hooks/register.ts`. `.test.js` is not discovered |
| Typecheck | `tsc -p <dir>/tsconfig.json`; for JS enable `allowJs` and `checkJs`, with JSDoc imports for host API types |
| Load one session | `claude --plugin-dir <dir>` — hot-reloads on save |
| Load always | only when requested: `CLAUDE_CODE_PLUGIN_DIRS` in environment or `env` of `~/.claude/settings.json`; absolute paths, `:`-separated, `;` on Windows. Writing a mod under user scope alone does not activate it |
| Share | add the mod's directory to a plugin marketplace |
| Host-written mods | `~/.claude/dev-mods/<session-id>/<name>/`, deleted after `cleanupPeriodDays` |
| Generated session mod approval | in `default` and `acceptEdits`, protected-path writes require approval; the host also asks to enable hot reload. Respect its prompts; do not add a second scope-only confirmation |
| Generated session mod cannot load | no approval UI (`claude -p`, `dontAsk`), untrusted workspace, `--bare`, `--safe-mode`, disabled hooks, or managed policy. This is not a blanket ban on pre-existing mods loaded explicitly with `--plugin-dir` |

## tsconfig

First obtain the installed host's `.claude-plugin/types/tsconfig.json`. Loading a mod executes it: follow the host's approval flow, and never start an interactive session silently to generate types. If declarations are unavailable, report the typecheck as blocked, not passed. Do not fabricate API declarations or copy declarations from an unrelated host version.

Claude Code creates a root configuration extending its generated one when none exists. Preserve that relationship instead of replacing its compiler options with a standalone template. For TS:

```json
{
  "compilerOptions": {
    "noEmit": true
  },
  "extends": "./.claude-plugin/types/tsconfig.json",
  "include": ["hooks", "tests", "types", ".claude-plugin/types/**/*.d.ts"]
}
```

For JS use the same `extends` and `include`, with `"allowJs": true` and `"checkJs": true` alongside `"noEmit": true`. Annotate the entry point without TS-only syntax:

```js
/**
 * @param {import('claude-code').On} on
 * @param {import('claude-code').PluginOptions} options
 */
export function register(on, options) {
  on('tool.call', { tool: 'Bash' }, ($, e, next) => next(e))
}
```

For either language: validate the manifest and footprint, run the discovered TS tests, then run `tsc -p <dir>/tsconfig.json`. A missing compiler, missing host declarations, or zero tests discovered is an unfinished check. Tests must exercise the JS module when `--lang js` is selected.

A mod that calls another mod's noun declares that dependency and uses the host-generated dependency types, or includes the provider's `types/` folder without copying it.

## Storage

`$.store` persists across reloads and sessions. The reference calls it machine-wide; the [state guide](https://code.claude.com/docs/en/plugins/mods/interface#keep-state) specifies a JSON file belonging to the plugin under `~/.claude/plugins/store/`. Treat it as plugin-owned storage shared by that plugin's sessions, including sessions in different projects. Do not infer access to another plugin's store. Add a project or session identifier to keys when the data belongs to that scope, and record that sharing in the budget and threat model. A persistent counter is not session-local unless its keys enforce that scope. The host can clean up an unused store after `cleanupPeriodDays`.

## No row for the current host

Say that the host has no binding, write nothing, and stop. Guessing a module format produces a plugin that loads silently and does nothing.
