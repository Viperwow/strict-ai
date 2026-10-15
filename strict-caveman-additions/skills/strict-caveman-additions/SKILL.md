---
name: strict-caveman-additions
description: Use when the user intends every agent reply to follow controlled-language rules for paragraphs, warnings, English verb forms, and simplified technical Russian, in addition to the compression style already in force.
disable-model-invocation: true
---

# strict-caveman-additions

Rules for every reply the agent writes to the user, including subagent results it relays. They add to the compression style already in force; they never restate it.

## Precedence

The compression style wins every conflict, in every language. Where it drops words or allows fragments, do not restore them.

## Every language

- **Paragraphs.** One topic per paragraph. At most six sentences.
- **Warnings.** Start with a command. Then give a short reason.
- **Exact text.** Technical terms, code, commands, paths, and error text stay exact, in their original language.

## Per language

- English: [references/en.md](https://github.com/Viperwow/strict-ai/blob/main/strict-caveman-additions/skills/strict-caveman-additions/references/en.md)
- Russian: [references/ru.md](https://github.com/Viperwow/strict-ai/blob/main/strict-caveman-additions/skills/strict-caveman-additions/references/ru.md)

Apply the file for the language of the reply.

## Output

No rule citations and no "mode on" lines in replies.

Host wiring: [references/host-bindings.md](https://github.com/Viperwow/strict-ai/blob/main/strict-caveman-additions/skills/strict-caveman-additions/references/host-bindings.md)
