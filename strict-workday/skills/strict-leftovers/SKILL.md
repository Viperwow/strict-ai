---
name: strict-leftovers
description: Use when the user intends to see what is still left on a task and keep that list shrinking — recording open questions, review findings, and decisions word for word so nothing is lost between sessions, seeing which item pulled in which and how far the work drifted from the requirements, checking whether a requirement or the whole task is done, or moving what remains into follow-up tickets once it is. Invoke when the user asks "what's left", "what did we decide", "is this done", wants review comments logged against requirements, or wants a journal of a task's leftovers, in any language. Triggers on /strict-leftovers.
---

# strict-leftovers

A verbatim journal of what is left on one task. Every run makes the open list smaller or says why it did not.

## Invocation

```text
/strict-leftovers [task-id] [--graph]
```

| Parameter | Default | Purpose |
|---|---|---|
| `task-id` | resolved | explicit argument, then tracker key, then branch name; kebab-case, 60 characters maximum; fallback `YYYY-MM-DD-<topic>` |
| `--graph` | off | print the graph block in chat |

## Artifacts

This skill writes `.strict-ai/leftovers/`:

- `<task-id>.md` — the journal, format in [references/journal-format.md](https://github.com/Viperwow/strict-ai/blob/main/strict-workday/skills/strict-leftovers/references/journal-format.md). The journal is the record; the conversation is not. Quotes are verbatim, so a journal can hold secrets or customer data; keep it out of version control.
- `README.md` — one line per journal.

Configuration: read `.strict-ai/configs/strict-workday.json`, key `strict-leftovers`, before the run. No file ships; an absent file, key, or field means the default.

| Field | Default | Meaning |
|---|---|---|
| `driftDepth` | `3` | depth at which an entry counts as drift |
| `stallRuns` | `3` | runs in a row without `Open` shrinking before the stall rule fires |

## Sources

Read each source the agent can reach:

1. The session, from the first source that resolves: the host transcript file, then a session memory store, then the visible context. Locations per host: [references/host-bindings.md](https://github.com/Viperwow/strict-ai/blob/main/strict-workday/skills/strict-leftovers/references/host-bindings.md).
2. PR review comments, automated and human.
3. The tracker ticket: description and comments.
4. Messengers available to the agent, filtered to the task.

An unreachable source prints one line, `<Source> data is unavailable.`, and the run continues.

## Run

1. **Journal.** Read it, or create it. On creation, copy the DoD verbatim from the sources, or write `DoD: n/a` when none is stated, and add one `R<n>` per atomic requirement or DoD criterion, verbatim. With no requirement found, the task title becomes `R1`. Any run may append new `R<n>`.
2. **Read.** Take source content from `last-run` onward. Drop quotes the journal already holds.
3. **Extract.** Questions, findings, and decisions. Store each quote verbatim, and give each entry a title of at most 8 words in the user's language.
4. **Merge.** Entries that need the same decision are one entry. The first wording is the quote; every other wording goes under `also:` verbatim with its source.
5. **Link.** Infer each entry's parent from its content and compute its depth. An entry with no inferable parent is detached. Assign ids per the journal format; an entry that moves gets a new id and keeps the old one as `was`.
6. **Status.** `viewed` when the user referred to the entry; `decided` when the user stated a decision, stored verbatim under the question.
7. **Severity.** Assign it per the severity table in the journal format. Keep the source's label as `stated`.
8. **Route.**
   - A user remark like "would be cool", "not sure", or "need a ticket", with no explicit link to a requirement → `Detached`.
   - A detached entry the user links to a requirement → `Open`, with parent and depth. Its quote stays unchanged.
   - Any other entry with no parent → `Detached`.
   - An entry the user deferred → `Later`.
   - Anything else undecided → `Open`.
9. **Write.** Update `last-run` and `open-count`. Set `stall` to 0 when `Open` shrank, otherwise add 1. Rewrite the graph block and update the registry line.
10. **Print** the chat output.

Entries are never deleted. Quotes are never rewritten.

## Stall rule

When `stall` reaches `stallRuns`, the output opens with the stall line. Entries at `driftDepth` or deeper carry the tag `drift`.

## Done

**Requirement done.** Judge each `R<n>` on its own subtree. It is done when both hold:

1. No open entry in the subtree is `blocker`, `critical`, or `high`. The `stated` label never counts.
2. Every depth-1 entry is `decided`.

Progress `n/m` counts decided depth-1 entries out of all depth-1 entries of that requirement.

**Task done.** Every requirement is done and every check is green. Take check and review state from the sources and the local git state. A fact the agent cannot see prints `unknown` and counts as not met. Print each unmet condition on one line.

**Follow-ups.** When the task is done, move every remaining entry into the `Follow-ups` tree, links kept: undecided entries, `Later`, and `Detached`. List each root as a ticket candidate. Record a ticket link only when the user gives one.

## Chat output

```text
## strict-leftovers output

🟧 Stall Open 5 (+3).

Leftovers
1/5 R1 · <requirement title> | Blocked by L4
├─ 0/1 L1 · <entry title> | medium
│  └─ 0/1 L1.1 · <entry title>
│     └─ [ ] L1.1.1 · <entry title> | medium · drift
├─ [x] L2 · <entry title>
├─ [ ] L3 · <entry title> | low ▼ critical
├─ [ ] L4 · <entry title> | critical ▲ medium
└─ [ ] L5 · <entry title> | medium · was D1

Later
└─ [ ] L6 · <entry title> | low

Detached
- D2 · <remark, at most 30 words> | user

Tracker data is unavailable.
```

- The first line after the heading is the stall line, `🟧 Stall Open <n> (+<growth>).`, or, when the task is done, `✅ Task Done: please, review the follow-ups.` Neither applies → the output starts at `Leftovers`. One empty line follows it.
- `Leftovers` always prints. Its roots are the requirements; the tree holds `Open` and `Decided` entries in place.
- A branch shows `<decided children>/<children>` before its id. A leaf shows `[ ]` open or `[x]` decided.
- Siblings sort by id, ascending.
- Each line reads `<id> · <title>`, then meta after `|`. A requirement's meta is `gate ok` or `Blocked by <ids>`. An open entry's meta is its severity, `▲ <stated>` or `▼ <stated>` when the source labelled it lower or higher, then `drift` and `was <id>` when they apply. A decided entry has no meta.
- `Later`, `Follow-ups`, and `Detached` print only when not empty. `Later` and `Follow-ups` are trees; a `Follow-ups` root carries `ticket candidate`. `Detached` is a flat list: `<id> · <summary of at most 30 words> | <author>`.
- Unmet task-done conditions, then absence lines, come last.
