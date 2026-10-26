# Plugin format

`SKILL.md` states what a plugin is for. The concrete paths and field names live here as data. A new agent is a new row; the body of `SKILL.md` never changes for it.

Sources, checked 2026-10-26: [Agent Plugins 1.0.0](https://github.com/agentplugins/agent-plugins-spec/blob/main/spec/1.0.0.md), [Claude Code plugins reference](https://code.claude.com/docs/en/plugins-reference), [Codex plugins](https://developers.openai.com/codex/plugins/build), [Cursor plugins reference](https://cursor.com/docs/reference/plugins), [Copilot CLI plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference).

## Portable core

Every plugin ships the Agent Plugins 1.0.0 core, so it loads in any conforming client without a row of its own.

| File | Holds |
|---|---|
| `plugin.json` at the plugin root | `$schema` set to `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`, `name`, and optional `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`, `extensions`. The schema is closed: any other top-level field is ignored |
| `skills/<skill-name>/SKILL.md` | one directory per skill. Discovery is fixed at `skills/`; no root `SKILL.md` fallback |
| `mcp.json` | only when the plugin ships MCP servers: `$schema` set to `https://agent-plugins.org/schemas/1.0.0/mcp.schema.json`, `mcpServers`, and a transport `type` per server |

1.1.0 is a working draft. Target 1.0.0 until it is published.

## Agent bindings

| Agent | Manifest beside the core | MCP file it reads | Path variable |
|---|---|---|---|
| Claude Code | `.claude-plugin/plugin.json`. Claude Code does not read the root `plugin.json` | `.mcp.json` | `${CLAUDE_PLUGIN_ROOT}` |
| Codex | none. Codex reads the root `plugin.json`; Codex-only data goes under `extensions.com.openai` | `mcp.json` | `${PLUGIN_ROOT}` |
| Cursor | none for skills and MCP. Hooks, agents, commands, and rules load only from `.cursor-plugin/plugin.json` | `mcp.json` | `${CURSOR_PLUGIN_ROOT}`. Cursor does not expand `${PLUGIN_ROOT}` |
| any other agent | none. A conforming client loads the core | `mcp.json` | `${PLUGIN_ROOT}` |

Keep `name`, `version`, and `description` identical in every manifest. A plugin that reports two identities is one users cannot reason about.

A plugin with MCP servers ships both `mcp.json` and `.mcp.json`. Each one points at the same servers through its own path variable.

## Hooks

The Agent Plugins standard has no hooks. Each agent reads its own file, with its own event names and payloads:

| Agent | Hooks file | Trust |
|---|---|---|
| Claude Code | `hooks/hooks.json` | runs once the plugin is enabled |
| Codex | `hooks/hooks.json`, unless `extensions.com.openai.hooks` names another path | skipped until the user reviews and trusts the definition |
| Cursor | `hooks/hooks.json`, Cursor format only | Cursor CLI may not run plugin hooks; test in the IDE |

Claude Code and Codex both read `hooks/hooks.json`, with different event schemas. So a plugin that ships hooks targets exactly one agent and carries only that agent's manifest.

Resolve every hook command through that agent's path variable, not a relative path. Give every command an explicit timeout in seconds: hooks on session start and on each prompt sit on the hot path, and the timeout turns a hang into a missed hook.

## Manifest fields

| Field | Required | Holds |
|---|---|---|
| `name` | yes | the install name and the directory name. Kebab-case and permanent. Claude Code rejects names that start with `claude-`, `anthropic-`, or `cc-plugin-` |
| `version` | yes here | semver, starting at `0.1.0`. The standard leaves it optional |
| `description` | yes here | what the plugin does, phrased so an installer can tell whether they want it |
| `author` | yes here | `name` and `email` |
| `keywords` | no | search terms. The plugin's own name belongs among them |

## Layout

```text
plugin-name/
  plugin.json
  .claude-plugin/plugin.json
  skills/<skill-name>/SKILL.md
  mcp.json
  .mcp.json
  README.md
```

The two manifests and `skills/` are the floor. Every other entry appears when it has content and is absent otherwise. A hook plugin adds `hooks/hooks.json` and keeps only its own agent's manifest.

`README.md` at the plugin root earns its place when something in the tree needs explaining that no single component owns, such as how two hooks divide the work. A plugin whose skill already says everything does not need one.

## Marketplace

| File at the repository root | Read by |
|---|---|
| `.claude-plugin/marketplace.json` | Claude Code, Codex (as a legacy-compatible marketplace), Copilot CLI |
| `.cursor-plugin/marketplace.json` | Cursor, for a repository with several plugins |

Both files take the same entry shape. Add the entry to each one the repository has, with the same values:

| Key | Holds |
|---|---|
| `name` | matches the manifest `name` exactly |
| `source` | path to the plugin directory, relative to the repository root |
| `description` | may differ from the manifest. This one is read while browsing, not after install |
| `version` | matches the manifest `version` |
| `category` | the grouping shown to a browser |

## Local install check

| Agent | Load the plugin |
|---|---|
| Claude Code | `claude plugin validate <plugin-dir>`, then `claude --plugin-dir <plugin-dir>` |
| Codex | `codex plugin marketplace add <repo-root>`, install the plugin from it, restart, and confirm each skill appears |
| Cursor | install from the local directory and confirm each component appears in the IDE |

The entry is added last, after the plugin installs locally and every component loads.
