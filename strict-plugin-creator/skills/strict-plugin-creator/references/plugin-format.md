# Plugin format

`SKILL.md` states what a plugin is for. The concrete paths and field names live here as data. A new agent is a new row; the body of `SKILL.md` never changes for it.

| Agent | Detect | Manifest | Marketplace file | Path variable |
|---|---|---|---|---|
| Claude Code | `$CLAUDE_PLUGIN_ROOT` set, or `~/.claude` exists | `.claude-plugin/plugin.json` | `.claude-plugin/marketplace.json` at the repository root | `${CLAUDE_PLUGIN_ROOT}` |
| anything else | no row matched | — | — | — |

## Manifest fields

| Field | Required | Holds |
|---|---|---|
| `name` | yes | the install name and the directory name — kebab-case, permanent |
| `version` | yes | semver, starting at `0.1.0` |
| `description` | yes | what the plugin does, phrased so an installer can tell whether they want it |
| `author` | yes | `name` and `email` |
| `keywords` | no | search terms; the plugin's own name belongs among them |

## Layout

```text
plugin-name/
  .claude-plugin/plugin.json
  skills/<skill-name>/SKILL.md
  commands/
  agents/
  hooks/hooks.json
  .mcp.json
  README.md
```

Only the manifest is required. Every other entry appears when it has content and is absent otherwise.

`README.md` at the plugin root earns its place when something in the tree needs explaining that no single component owns — how two hooks divide labour, why a component exists at all. A plugin whose skill already says everything does not need one.

## Hooks

`hooks/hooks.json` registers each script against an event. Resolve every command through the path variable in the binding table above rather than a relative path, so it works from any working directory. Installing the plugin is the whole setup — a plugin's hooks need no entry in any settings file.

## Marketplace entry

One object in the `plugins` array of the marketplace file:

| Key | Holds |
|---|---|
| `name` | matches the manifest `name` exactly |
| `source` | path to the plugin directory, relative to the marketplace file |
| `description` | may differ from the manifest — this one is read while browsing, not after install |
| `version` | matches the manifest `version` |
| `category` | the grouping shown to a browser |

The entry is added last, after the plugin installs locally and every component loads.
