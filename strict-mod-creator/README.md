# strict-mod-creator

Creates a mod when the requested behaviour must run inside the coding agent's engine: commands, interface elements, event rewrites, tool-call guards, or capabilities other mods call. It declares the mod's reach before writing and checks the resulting footprint, behaviour, and types.

## Install and use

In Claude Code:

```text
/plugin marketplace add Viperwow/strict-ai
/plugin install strict-mod-creator@strict-ai
/strict-mod-creator show the duration of each tool call above the prompt
```

The skill supports JS and TS modules. The current mod host binding is Claude Code v2.1.287 or later; the skill's workflow stays host-independent, and another host needs its own binding before generation is supported. Installing this skill does not enable any generated mod globally.

## Package

- [skills/strict-mod-creator/SKILL.md](https://github.com/Viperwow/strict-ai/blob/main/strict-mod-creator/skills/strict-mod-creator/SKILL.md) — creation workflow, scope, reach budget, and completion checks.
- [skills/strict-mod-creator/references/host-bindings.md](https://github.com/Viperwow/strict-ai/blob/main/strict-mod-creator/skills/strict-mod-creator/references/host-bindings.md) — host formats, approvals, activation, and JS/TS checks.
- [skills/strict-mod-creator/references/claude-code-mods.md](https://github.com/Viperwow/strict-ai/blob/main/strict-mod-creator/skills/strict-mod-creator/references/claude-code-mods.md) — API snapshot; installed-version declarations take precedence.
- [skills/strict-mod-creator/evals/case-01.md](https://github.com/Viperwow/strict-ai/blob/main/strict-mod-creator/skills/strict-mod-creator/evals/case-01.md) — golden case. The repository also holds trigger examples; these are specifications, not proof of a model evaluation run.
