---
name: strict-plugin-creator
description: Use when components that ship and version together need to become one installable unit — creating a plugin, scaffolding its manifest and directories, deciding whether a domain earns a plugin at all, bundling skills, commands, agents, or hooks, and listing the result in a marketplace. Triggers on /strict-plugin-creator.
---

# strict-plugin-creator

Turns a domain into an installable plugin: the manifest, only the directories it actually uses, each component written by whichever creator owns that component, and one marketplace entry. It is the last rung of the ladder — a script becomes a CLI, a CLI grows a companion skill, and a set of pieces that ship and version together becomes a plugin.

Writing the tree is free. Listing it in the marketplace hands it to everyone who has that marketplace, so that step is the one gate.

## Invocation

```text
/strict-plugin-creator [what ships together]
```

One flow, no subcommands.

## Does it earn a plugin?

A plugin is a unit of distribution, not a unit of authorship. Read down the table and stop at the first row that matches.

| What you have | Where it goes |
|---|---|
| Anything that ships a hook | plugin, always — see the hook rule below |
| One repeated routine inside one repository | script — hand it to a script creator |
| One skill, however large | an existing package — a plugin around a single skill is packaging overhead with no payoff |
| One tool, API, or CLI wrapped for other skills to call | an adapter module in the package that holds adapters |
| A component that must install on its own schedule, or version separately from its neighbours | plugin |
| Several components — skills, commands, agents, hooks — that install together and version together | plugin |

**The hook rule.** A hook runs whether or not anyone asked for it. Shipped inside a package someone installed for a different skill, it fires on their sessions uninvited. So a hook narrows the unit rather than joining an existing one, and it outranks every row below it: one skill plus the hooks that serve it is a plugin, however small, because there is nowhere else the hooks can live. What the rule forbids is the reverse — hanging hooks off a package that holds unrelated skills.

Failing the gate is a result, not a dead end. Name the home the table points at, say so in one line, and stop.

## Create flow

Run the steps in order.

| Step | You do | Gate |
|---|---|---|
| 1 | Read the gate table above and decide | fails → name the right home, stop |
| 2 | Survey what already exists — packages, their skills, the marketplace listing | **never skip** |
| 3 | Pick the name, check it against every existing package and the marketplace | collision → rename |
| 4 | List the components it ships and route each one — [references/component-routing.md](https://github.com/Viperwow/strict-ai/blob/main/strict-plugin-creator/skills/strict-plugin-creator/references/component-routing.md) | — |
| 5 | Write the manifest and only the directories that have content — [references/plugin-format.md](https://github.com/Viperwow/strict-ai/blob/main/strict-plugin-creator/skills/strict-plugin-creator/references/plugin-format.md) | never gated |
| 6 | Author each component through the creator that owns it | — |
| 7 | Install it locally and confirm every component loads | — |
| 8 | Show the tree and the marketplace entry — wait for confirmation | human clears |
| 9 | Add the marketplace entry, then confirm every surface that advertises the plugin agrees | — |

## Rules

- **Step 2.** Read the listing file, glob the package manifests and skill files under the repository root, and read whatever note the README uses to advertise the installable set. A component that belongs in a package that already exists goes there. Reuse beats a new plugin, and a new plugin is the most expensive answer on the table.
- **Step 3.** The name is the install command and the directory, so it is effectively permanent. Kebab-case, descriptive, no version or status word in it.
- **Step 4.** Route first: a component type with a creator is written by that creator, so one authoring standard per type survives instead of a second one growing here. A creator that is not available is not a blocker — write the component here to that standard, and say which creator would have owned it.
- **Step 5.** Ship only directories with content. An empty `agents/` teaches a reader the plugin has agents.
- **Step 6.** Components carry their own gates — an agent needs its eval, a script needs its verification run. Those gates hold inside this flow; do not clear them on the plugin's behalf.
- **Step 7.** Installing locally is the test. A manifest that parses proves nothing about whether a skill's frontmatter is readable or a hook's command resolves.
- **Step 8.** Show the whole tree and the exact marketplace entry in one block, so one confirmation covers both.
- **Step 9.** Then confirm the four surfaces agree: the plugin on disk, its entry in the listing, whatever note advertises the installable set, and the listing's own version where it carries one. A repository with a script for this runs the script. A plugin present on disk and absent from the listing installs for nobody.

## Common mistakes

| Mistake | Reality |
|---|---|
| A plugin per skill | Distribution overhead with no payoff. A skill that ships no hook belongs in a package that already exists. |
| Shipping a hook inside a shared package | The hook fires for everyone who installed that package for something else. A hook makes the plugin single-purpose. |
| Scaffolding every directory the format allows | Empty directories are a claim about what the plugin does. Ship what has content. |
| Writing the skills and agents inline here | Each component type has a creator that owns its standard. Route to it. |
| Listing it in the marketplace before it installs | The listing is the irreversible step; a broken plugin reaches every installer at once. |
| Choosing the name last | The name is the install command and the directory. It is chosen once and lives forever. |
| Leaving the listing out because the tree is right | A plugin nobody can install is a directory. |

## References

- [references/plugin-format.md](https://github.com/Viperwow/strict-ai/blob/main/strict-plugin-creator/skills/strict-plugin-creator/references/plugin-format.md) — the manifest fields, the directory layout, and the marketplace entry, per agent.
- [references/component-routing.md](https://github.com/Viperwow/strict-ai/blob/main/strict-plugin-creator/skills/strict-plugin-creator/references/component-routing.md) — which creator owns which component type.
