# strict-caveman-additions — design

Date: 2026-10-15
Package: `strict-caveman-additions` (new top-level package, requested by the user)
Skill: `strict-caveman-additions`

## Problem

The user talks to the agent in Russian and English. A compression mode runs in every session. It cuts
filler and already applies the core of ASD-STE100: short sentences, active voice, imperative
instructions, one term per concept. It handles Russian worse than English, and it leaves paragraph
length, verb forms, and warnings unregulated.

## Intent

Add only what the compression mode lacks. The compression mode is primary: on any conflict it wins.

## Goals

- Always on, from the first reply of every session, with no command.
- Applies to text the agent writes to the user, including subagent results it relays.
- Adds rules the compression mode does not have, in every language:
  - paragraphs: one topic, at most six sentences (ASD-STE100; ГОСТ Р 58049-2017, 8.2.6.2);
  - warnings: start with a command, then a short reason (ASD-STE100; ГОСТ Р 58049-2017, 8.2.7).
- Adds per-language rules as reference files:
  - `references/en.md` — verb forms: simple present, simple past, simple future; no `-ing` form used as a
    noun or to start a clause (ASD-STE100);
  - `references/ru.md` — simplified technical Russian (УТР), section 8.2 of ГОСТ Р 58049-2017, restated
    in own words with clause numbers.

## Non-goals

- Any rule the compression mode already states. It is not restated.
- The ASD-STE100 approved-word dictionary.
- German now. Later, as `references/de.md`, when the user asks.
- Code, commit messages, documents, and files.
- A rewrite command for arbitrary text.

## Anti-goals

- Longer replies than the compression mode alone would produce, except where a rule above requires it.
- Lost technical meaning.
- Metadata noise: no "mode on" lines, no rule citations in replies.

## Precedence

The compression mode wins every conflict, in every language, Russian included. Where it allows fragments
or dropped words, this package does not restore them.

## `references/ru.md` content

| Rule | Clause |
|---|---|
| A sentence has at most 20 words. Text in brackets counts as a new sentence. A number, an abbreviation, an identifier, and a quoted name each count as one word. | 8.2.5.1, 8.2.6.1 |
| One instruction per sentence, unless the actions happen at the same time. | 8.2.5.2 |
| Instructions use the imperative. | 8.2.5.3 |
| Direct word order. The subject does not go to the end. The object does not go before the verb. | 8.2.3.4 |
| Active voice, impersonal and indefinite-personal constructions. | 8.2.3.3 |
| No metaphors, comparisons, slang, or jargon. | 8.2.3.5 |
| One concept, one term. No synonyms for the same concept. | 8.2.3.7 |
| Prefer the shortest common term. | 8.2.3.8 |
| Limit participial and adverbial-participial phrases and compound predicates. | 8.2.3.11 |
| Enumerations in complex text go in vertical bulleted lists. | 8.2.3.16 |

Some rows repeat compression-mode rules in Russian form. They stay because the compression mode applies
them weakly to Russian.

Technical terms, code, commands, paths, and error text stay exact, in their original language.

## Activation

A host hook injects `SKILL.md` and every language reference at session start, and a one-line reminder on
every user prompt. Claude Code only: hooks in `hooks/hooks.json`; mechanics in a binding table in
`references/host-bindings.md`.

`SKILL.md` sets `disable-model-invocation: true`: the hook loads it, the model never does, so it needs no
trigger eval set. To turn the mode off, the user disables the plugin.

After a trial period, if a language reference does not fit, the user may remove it in a separate commit.

## Package layout

```text
strict-caveman-additions/
  .claude-plugin/plugin.json
  hooks/hooks.json
  skills/strict-caveman-additions/
    SKILL.md                      (scope, precedence, paragraphs, warnings, exact-text rule)
    references/en.md
    references/ru.md
    references/host-bindings.md
    evals/case-01.md              (Russian reply)
    evals/case-02.md              (English reply)
  README.md
```

The repository's `CLAUDE.md` gains the package in its canonical structure and package table.
`marketplace.json` and the README availability note gain the package.

## Evals

Behavior cases only. Given a prompt and the compression mode on, the reply:

- keeps paragraphs to one topic and at most six sentences;
- starts every warning with a command;
- in English, uses only simple tenses and no `-ing` noun forms;
- in Russian, meets `references/ru.md`;
- keeps technical text exact;
- is no longer than the compression mode alone, except where the rules above require it.

## Evidence

| Choice | Evidence |
|---|---|
| Controlled language at all | Simplified English significantly improves comprehension of complex documents with no change in reading time; on simple task cards the gain was not significant (Eckert 1997, n=148). |
| 20-word limit in Russian | ГОСТ Р 58049-2017, 8.2.5.1 and 8.2.6.1. |
| Additions only | The compression mode already embeds the ASD-STE100 core; restating it adds tokens and conflict. |

## Prior art

- `ztemerbekov/asd-ste100-ru-skill` (MIT): rewrites agent replies into УТР on request. Not always on. Its
  copy of the standard's text is excluded from its license, so this package restates the rules.
- `posthog/ai-plugin` `writing-simplified-technical-english`: English, ASD-STE100, on request.

## Builder's calls

- Hook script language and exact command, as long as it runs on Windows and POSIX.
- Wording of the per-prompt reminder.
