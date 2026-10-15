# strict-controlled-language — design

Date: 2026-10-15
Package: `strict-controlled-language` (new top-level package, requested by the user)
Skill: `strict-controlled-language`

## Problem

The user talks to the agent in Russian. Agent replies arrive as long, varied, repetitive text. Each reply
has a different structure, so the user spends effort parsing it before understanding it. A compression
mode already runs in every session and removes filler, but it handles Russian worse than English, and it
says nothing about how a Russian sentence is built.

## Intent

Every agent reply in Russian follows simplified technical Russian (УТР), section 8.2 of
ГОСТ Р 58049-2017. The user reads one structure every time and understands faster.

The package complements the modes already installed; it never restates their rules. After a trial period, if a
language reference does not fit, the user may remove it in a separate commit.

## Goals

- Always on, from the first reply of every session, with no command.
- Applies to agent replies, by reply language: Russian per `references/ru.md` (УТР), English per
  `references/en.md` (ASD-STE100 writing rules).
- `SKILL.md` holds only what is common to every language: scope, precedence, what stays exact. Each
  language is one reference file; a new language is a new file.
- Works together with a compression mode: the compression mode decides what to cut; this package decides
  how the remaining sentences are built.

## Non-goals

- German now. Later, as `references/de.md`, when the user asks.
- The ASD-STE100 approved-word dictionary. Writing rules only.
- Rewriting code, commit messages, documents, or files. Chat replies only.
- A rewrite command for arbitrary text.

## Anti-goals

- Lost technical meaning. A shorter sentence that drops a fact is a failure.
- Broken grammar. Dropping prepositions, conjunctions, or case endings to save words is a failure.
- Metadata noise: no "УТР mode on" lines, no rule citations in replies.

## Rules

Each reference states the rules in its own words, with the clause or rule number of its standard beside
each. Neither copies a standard's text.

`references/en.md` covers the ASD-STE100 writing rules: at most 20 words per procedural sentence and 25 per
descriptive one, one instruction per sentence, active voice, imperative for instructions, one meaning per
word and one word per meaning, no omitted articles or words to shorten a sentence, paragraphs of one topic.

`references/ru.md` covers section 8.2 of ГОСТ Р 58049-2017:

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
| One paragraph, one topic, at most six sentences. | 8.2.6.2 |
| A warning starts with a command, then a short reason. | 8.2.7 |

Technical terms, code, commands, paths, and error text stay exact, in their original language.

## Precedence

When the compression mode and these rules conflict, clarity wins: grammar words stay, filler goes. The
compression mode already ranks clarity above compression, so the two do not fight.

## Activation

A host hook injects `SKILL.md` and every language reference at session start and a one-line reminder on every user prompt, the same
mechanism the compression mode uses. Hook mechanics are host-specific and live in a binding table in
`references/host-bindings.md`, one row per host.

To turn the mode off, the user disables the plugin. No per-session toggle.

## Package layout

```text
strict-controlled-language/
  .claude-plugin/plugin.json      (declares the hooks)
  skills/strict-controlled-language/
    SKILL.md                      (scope, precedence, exact-text rule)
    references/ru.md              (УТР, ГОСТ Р 58049-2017 section 8.2)
    references/en.md              (ASD-STE100 writing rules)
    references/host-bindings.md
    evals/case-01.md
  README.md
```

The repository's `CLAUDE.md` gains the package in its canonical structure and package table.
`marketplace.json` and the README availability note gain the package.

## Evidence

| Choice | Evidence |
|---|---|
| Controlled language at all | Simplified English significantly improves comprehension of complex documents with no change in reading time; on simple task cards the gain was not significant (Eckert 1997, n=148). Agent replies about code and design are complex text. |
| 20-word limit | ГОСТ Р 58049-2017, 8.2.5.1 and 8.2.6.1; ASD-STE100 uses 20 for procedures and 25 for descriptions. |
| One structure every reply | Reading effort drops when the reader does not have to re-learn the layout; same basis as the standard's 8.2.3.1–8.2.3.2. |

## Prior art

- `ztemerbekov/asd-ste100-ru-skill` (MIT): rewrites agent replies into УТР on request. Not always on. Its
  copy of the standard's text is excluded from its license, which is why this package restates the rules.
- `posthog/ai-plugin` `writing-simplified-technical-english`: English, ASD-STE100, on request.

## Resolved calls

Settled during the builder check. Each is the author's call.

- **No reply skeleton.** The compression mode already fixes the reply order: answer, reason, next step.
  This package adds sentence and paragraph rules only.
- **Full sentences.** Every Russian sentence has a predicate, or is an impersonal or indefinite-personal
  construction. Verbless fragments are allowed only as list items and table cells.
- **Host.** Claude Code only: one row in `references/host-bindings.md`. Hooks live in `hooks/hooks.json`,
  as in the repository's other packages.
- **Scope.** The rules cover text the agent writes to the user, including subagent results it relays.
  Subagents themselves are not wired; no `SubagentStart` hook.
- **Not model-invocable.** The hook loads the skill. `SKILL.md` sets `disable-model-invocation: true`, so the
  skill never loads twice and needs no trigger eval set.
- **Evals.** Behavior cases only: given a prompt, the reply meets the rules — sentence length, predicate,
  word order, one term per concept, exact technical text.

## Builder's calls

- Hook script language and exact command, as long as it runs on Windows and POSIX.
- Wording of the per-prompt reminder.
- Trigger description and eval queries.
