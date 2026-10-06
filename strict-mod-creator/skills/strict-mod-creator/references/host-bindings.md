# Host bindings

One row per host that loads mods. A new host is a new row; the skill does not change.

| Field | Claude Code |
|---|---|
| Minimum version | `v2.1.287` — check with `claude --version` |
| Enable flag | none; mods are on by default. `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` is ignored from this version |
| Manifest | `.claude-plugin/plugin.json` — `name`, `version`, `description`, `author`; options in `userConfig` |
| Module pointer | `hooks/hooks.json` — `{ "description": "...", "modules": ["./register.ts"] }`. The `modules` key makes the plugin a mod |
| Entry | `export function register(on, options)` |
| Type declarations | written by `/plugin-types`; import with `import type { On, PluginOptions } from 'claude-code'` |
| Test kit | `import { describe, expect, mock, test, tier } from 'claude-code/testing'` |
| Validate | `claude plugin validate <dir>` — prints hooks and calls |
| Test | `claude plugin test <dir>` |
| Typecheck | `tsc -p <dir>/tsconfig.json` |
| Load one session | `claude --plugin-dir <dir>` — hot-reloads on save |
| Load always | `CLAUDE_CODE_PLUGIN_DIRS` in `env` of `~/.claude/settings.json`; `:`-separated, `;` on Windows |
| Share | add the mod's directory to a plugin marketplace |
| Host-written mods | `~/.claude/dev-mods/<session-id>/<name>/`, deleted after `cleanupPeriodDays` |
| Does not load | `claude -p` without approval, `dontAsk` mode, untrusted workspace, `--bare`, `--safe-mode`, `disableAllHooks`, managed `allowManagedModsOnly` |

## tsconfig

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["es2023"],
    "types": [],
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "skipLibCheck": true,
    "jsx": "react",
    "jsxFactory": "h",
    "jsxFragmentFactory": "Fragment"
  },
  "include": ["hooks", "tests", "types"]
}
```

A mod that calls another mod's noun adds that mod's `types/` folder to `include`.

## No row for the current host

Say that the host has no binding, write nothing, and stop. Guessing a module format produces a plugin that loads silently and does nothing.
