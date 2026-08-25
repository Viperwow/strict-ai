---
name: strict-comment
description: Use when deciding whether a comment belongs on a piece of code, or when reviewing comments already written — writing a doc block for an exported symbol, explaining a workaround or quirk, marking a TODO/FIXME, or stripping comments that restate the code. Invoke when the user asks whether to comment something, asks to document a function, asks to clean up comments in a diff, or writes code whose control flow is hard to follow. Triggers on /strict-comment.
---

# strict-comment

Code carries what it does. A comment carries what the code cannot: intent, cause, contract. Two kinds, two opposite defaults.

| Kind | Where | Default |
|---|---|---|
| Doc block | above a declaration | required on exports and on any symbol whose purpose is not readable from its name and type |
| Inline comment | inside a body | none, until a trigger below fires |

## Invocation

`/strict-comment [file, diff, or symbol]` — without the argument, the subject is the code in the current turn.

## Before commenting

A comment is the last step, not the first. In order: rename it, extract it, simplify it, then comment what is left. If a clear comment will not form, the code is the problem — fix the code.

## Doc block

Write it for the caller, not for the author.

1. Required on every top-level export, and on any internal symbol whose purpose is not obvious from its name and type.
2. State what it is for, what it returns, and what it costs the caller — preconditions, side effects, thrown errors, ownership of what it returns.
3. Document a parameter only where the name and type leave something open: a unit, a range, a legal combination, a default.
4. Never restate a name or a type the language already declares.
5. Skip it on a symbol exported only for tooling, and on a trivial accessor.

Syntax per language: [references/doc-syntax.md](https://github.com/Viperwow/strict-ai/blob/main/strict-development/skills/strict-comment/references/doc-syntax.md).

## Inline comment: the triggers

Exactly seven. Nothing else earns one.

1. **Cognitive complexity at or above the threshold.** Refactor first. When the shape is irreducible, one comment names the shape — the invariant the branches hold, the order the steps depend on. Scoring and threshold: [references/cognitive-complexity.md](https://github.com/Viperwow/strict-ai/blob/main/strict-development/skills/strict-comment/references/cognitive-complexity.md).
2. **Workaround.** Name what it works around and where that is tracked — an upstream bug, a vendor version, a spec gap. Code that looks wrong until you know the cause is what the next reader deletes.
3. **Quirk.** A constraint invisible in the code: an ordering the runtime imposes, a limit the data has, a value the hardware needs calibrated.
4. **Deliberate trade-off.** The obvious better option was rejected — say which and why, or someone will "improve" it back.
5. **Unidiomatic code.** A construction a competent reader of this language would not expect here.
6. **`TODO` / `FIXME`.** Reason plus task link. No link, no marker — an unlinked marker is a wish, and wishes belong in the tracker.
7. **Known performance ceiling.** The shape is cheap at today's input and will not stay cheap — a linear scan inside a loop, a query per row, a buffer nothing bounds. Name the ceiling and the upgrade path. Trigger 1 never catches this: it scores control flow, not cost.

Copied code carries a link to its source. That belongs to whichever comment already earned its place, not to a trigger of its own.

## Never comment

1. What the line below already says.
2. A pattern typical of the language or framework — a hook dependency array, a context manager, a builder chain, a DI constructor.
3. Commented-out code. Git holds it.
4. Section banners, step narration, decorative dividers.
5. Authorship, dates, change history. Git holds those too.
6. Anything outside this repository — an external convention, an authoring persona, a tool that ships no code here.
7. A stale claim. Prefer deleting a comment to updating it.

## Configuration

`.strict-ai/configs/strict-development.json`, key `strict-comment`. Absent file, absent key, or absent field: use the default.

```json
{
  "strict-comment": {
    "cognitiveComplexityThreshold": 15,
    "taskLinkRequired": true
  }
}
```

`cognitiveComplexityThreshold` fires trigger 1. `taskLinkRequired` fires the link half of trigger 6.

## Output

Reviewing existing code, one line per finding, nothing else:

```text
path:line: add doc | add inline | delete | rewrite — reason
```

Writing new code, emit the comment itself. No note explaining why it was written, and no note explaining why the other lines carry none.
