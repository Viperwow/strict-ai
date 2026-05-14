# CLAUDE.md

Primary operating guide for any assistant, agent, automation, or contributor in the strict.ai repository. First source of truth for structure, placement, and authoring conventions.

## Core principle

Preserve repository structure as a stable contract. Change only on explicit user request.

Route new content into the most accurate existing package. When placement confidence is low, prefer `strict-labs`, then ask.

## Canonical top-level structure

```text
strict/
  strict-workday/
  strict-communication/
  strict-development/
  strict-management/
  strict-quality/
  strict-security/
  strict-workflows/
  strict-knowledge/
  strict-foundation/
  strict-adapters/
  strict-labs/
  strict-deprecated/
```

## Packages

| Package | Route here/use this when the work is about                                                                                    |
|---|-------------------------------------------------------------------------------------------------------------------------------|
| `strict-workday` | daily operating rhythm, focus, time management, day planning, personal workday assistance                                     |
| `strict-communication` | drafting messages, Slack/email, summaries, communication prep, knowledge-grounded responses                                   |
| `strict-development` | technical implementation, architecture, coding, PR prep — **building the change**                                             |
| `strict-management` | decomposition, sprint planning, prioritization, backlog shaping, managerial coordination — **planning before implementation** |
| `strict-quality` | testing, verification, quality gates, test evidence, review quality                                                           |
| `strict-security` | security review, secure design, secrets handling, vulnerability checks, threat procedures                                     |
| `strict-workflows` | composing multiple lower-level skills, end-to-end flows, cross-package orchestrations                                         |
| `strict-knowledge` | internal procedures, playbooks, knowledge-grounded guidance                                                                   |
| `strict-foundation` | shared reusable primitives across multiple packages — rules, policies, templates, hooks                                       |
| `strict-adapters` | one specific tool/API/CLI/SDK only; replaceable; invocable by other skills only, not directly by users                        |
| `strict-labs` | experimental, still stabilizing, or searching for a permanent home                                                            |
| `strict-deprecated` | confirmed replacement exists; removal scheduled; not the recommended path for any use case                                    |

**Boundary notes:**
- `strict-workflows` composes atomic skills from domain packages; keep atomic skills in their domain package.
- `strict-adapters` holds tool-specific knowledge only; keep business logic and workflows in domain packages.
- `strict-deprecated` skills cannot be invoked directly — see Deprecation protocol.

## Naming conventions

Top-level packages: `strict-` prefix, kebab-case, stable. Preserve adopted names until user explicitly requests a rename. Add new top-level packages only on explicit user request.

`strict-adapters` modules are named after the concrete tool:

```text
strict-adapters/
  slack/  jira/  bamboo/  testrail/  github/
  gitlab/  confluence/  google-calendar/  kubectl/  terraform/
```

When a stronger or official skill becomes available, switch implementations while preserving higher-level package structure. When deprecating an adapter skill, follow the **Deprecation protocol** below.

## Deprecation protocol

### Prerequisites

1. Identify the replacement skill — confirmed available and installable.
2. Research coverage: verify the replacement covers all functionality of the deprecated skill. Document gaps explicitly.
3. Update the **linking skill** with: replacement name + install location, coverage analysis result, known gaps.

### Linking skill structure

The linking skill must state:
- Skill is deprecated.
- Replacement name and where to install it.
- Coverage summary: covered vs. missing.
- Fallback path when a replacement is not found.

### Standardized fallback message

When the replacement skill is not installed, **always** output this exact message verbatim, then proceed automatically — no user prompt:

```
[STRICT-DEPRECATED] Replacement skill '<replacement-skill-name>' is not installed.
To use the supported version, install it from: <install-url>.
Falling back to deprecated skill '<deprecated-skill-name>' automatically.
Note: the deprecated skill will be removed in a future release.
```

### Deprecation checklist

- [ ] Replacement skill identified and publicly available
- [ ] Coverage research completed and recorded in linking skill
- [ ] Linking skill updated with replacement reference and fallback message spec
- [ ] Deprecated skill file moved to `strict-deprecated/` and marked as non-invocable directly
- [ ] Deprecated skill file contains a header pointing to the replacement

## Skill authoring conventions

Before creating or editing a skill, review:
- Find existing skills: <https://www.skills.sh/vercel-labs/skills/find-skills>
- Claude Code skills docs: <https://code.claude.com/docs/en/skills>
- Agent Skills overview: <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview>
- Anthropic guide: <https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf>
- Public skills repo: <https://github.com/anthropics/skills>
- Skill creator: <https://www.skills.sh/anthropics/skills/skill-creator>

Authoring rules:
1. Narrow, single-purpose skills.
2. Stable, descriptive names.
3. Follow `SKILL.md` official structure.
4. Clear description so the model knows when to invoke the skill.
5. Keep supporting assets near the skill.
6. Extend conventions only on explicit user request.
7. KISS, DRY, SOLID (S first and foremost).
8. 80/20: maximum impact, minimum text.
9. If something appears twice, extract and reference it.
10. Default placement for any new skill is `strict-labs` unless the user specifies otherwise. Before creating, propose the target plugin and wait for user confirmation.

## Hooks, plugins, agents, and MCP

Before creating hooks, plugins, agents, or MCP, review:
- Plugin structure and examples: <https://github.com/anthropics/claude-code/blob/main/plugins/README.md>
- Plugin overview: <https://www.anthropic.com/news/claude-code-plugins?cb=zapier>
- Subagents: <https://docs.claude.com/en/docs/claude-code/sub-agents?_bhlid=fab9dd4ba867c6a3f19d2ee04c0262e5f9fc2d40>
- MCP announcement: <https://www.anthropic.com/news/model-context-protocol>
- MCP docs: <https://modelcontextprotocol.info/docs/>
- MCP course: <https://anthropic.skilljar.com/introduction-to-model-context-protocol>

Hooks: deterministic enforcement. Workflows: composition. Adapters: tool-specific knowledge. Foundation: shared primitives.

## Preferred internal package layout

```text
package-name/
  .claude-plugin/plugin.json
  skills/
  hooks/
  agents/
  docs/
  README.md
```

Include only directories useful for the package.

## Repository guardrails

1. Preserve every `strict-*` package name until user explicitly requests a change.
2. Add new top-level packages only on explicit user request.
3. Preserve stable content in its established package unless the user explicitly approves a move.
4. Treat this file as the active repository policy.
5. Route tool-specific modules into `strict-adapters`.
6. Route decomposition and managerial planning into `strict-management`.
7. Route security ownership into `strict-security`.
8. Promote content from `strict-labs` when its stable home becomes clear.
9. When uncertainty remains, ask or place into `strict-labs` first.
10. Move content into `strict-deprecated` only when a replacement is confirmed and coverage research is complete.
11. Never invoke skills from `strict-deprecated` directly — route through the replacement, with fallback per the deprecation protocol.
12. After adding or removing skills in any plugin, sync `marketplace.json` (add plugin if it now has skills and is not yet listed; remove if it has none) and update the availability note in `README.md`.
