---
name: strict-leftovers
description: Use when the user intends to see what is still left on a task and keep that list shrinking — recording open questions, review findings, and decisions word for word so nothing is lost between sessions, seeing which item pulled in which and how far the work drifted from the requirements, checking whether a requirement or the whole task is done, or moving what remains into follow-up tickets once it is. Invoke when the user asks "what's left", "what did we decide", "is this done", wants review comments logged against requirements, or wants a journal of a task's leftovers, in any language. Triggers on /strict-leftovers.
---

# strict-leftovers

A verbatim journal of what is left on one task. Every run makes the open list smaller or says why it did not.

Each run rebuilds the trees from the journal, so entries may move between trees as the work changes. The output always answers, without ambiguity:

| Question | Where |
|---|---|
| What is left, and what grew from what? | `Leftovers` |
| What are we working on now? | open entries in `Leftovers` |
| What is deferred? | `Later` |
| What becomes separate tasks? | `Follow-ups`, `Detached` |

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

Check all four sources on every run:

1. Session, from the first source that resolves: the host transcript file, then a session memory store, then the visible context. Locations per host: [references/host-bindings.md](https://github.com/Viperwow/strict-ai/blob/main/strict-workday/skills/strict-leftovers/references/host-bindings.md).
2. PR: review comments, automated and human.
3. Tracker: the ticket's description and comments.
4. Messenger: messengers available to the agent, filtered to the task.

A source that is missing (no PR yet, no tracker key) or unreachable prints one line, `<Source> data is unavailable.`, with `<Source>` being `Session`, `PR`, `Tracker`, or `Messenger`, and the run continues.

## Run

1. **Journal.** Read it, or create it. On creation, copy the DoD verbatim from the sources, or write `DoD: n/a` when none is stated, and add one `R<n>` per atomic requirement or DoD criterion, verbatim. With no requirement found, the task title becomes `R1`. Any run may append new `R<n>`.
2. **Read.** Take source content from `last-run` onward. Drop quotes the journal already holds.
3. **Extract.** Questions, findings, and decisions. Store each quote verbatim, and give each entry a title of at most 8 words in the user's language.
4. **Split and merge.** A quote whose parts are joined by "and" becomes one entry per part: the whole quote is the parent, each part a child quoting that part verbatim. Entries that one answer or one fix settles are one entry. The first wording is the quote; every other wording goes under `also:` verbatim with its source.
5. **Link.** Infer each entry's parent from its content and compute its depth. An entry raised by another one ("also", "either", "too", "while we're here") is its child, unless one fix settles both, which makes it one entry. A review comment that names no entry hangs off the requirement. An entry with no inferable parent is detached. Assign ids per the journal format; an entry keeps its id across sections and trees; only a new parent gives it a new id, with the old one kept as `was`.
6. **Status.** `viewed` when the user referred to the entry; `decided` only with proof, stored under `proof`: for a change, a deterministic proof when one is reachable (a passing test or check, a commit); otherwise the user's decision, verbatim. Deciding an entry never decides its children.
7. **Severity.** Assign it per the severity table in the journal format. Keep the source's label as `stated`. When the severity differs from `stated`, record why in one line under `why`.
8. **Route.**
   - A user remark like "would be cool", "not sure", or "need a ticket", with no explicit link to a requirement → `Detached`.
   - A detached entry the user links to a requirement → `Open`, with parent and depth. Its quote stays unchanged.
   - Any other entry with no parent → `Detached`.
   - An entry the user deferred → `Later`.
   - Anything else undecided → `Open`.
   - The user may ask to move any entry to another tree on any run. Apply it; the entry takes its subtree with it, links kept.
9. **Write.** Update `last-run` and `open-count`. Set `stall` to 0 on the first run or when `Open` shrank, otherwise add 1. Rewrite the graph block and update the registry line.
10. **Print** the chat output.

Entries are never deleted. Quotes are never rewritten.

## Stall rule

When `stall` reaches `stallRuns`, the output opens with the stall line.

On every run, entries at `driftDepth` or deeper carry the tag `drift`.

## Done

**Requirement done.** Judge each `R<n>` on its own subtree in `Leftovers`; entries in `Later` or `Follow-ups` do not count. It is done when all hold:

1. No open entry in the subtree is `blocker`, `critical`, or `high`. The `stated` label never counts.
2. Every depth-1 entry is `decided`.
3. Every entry marked `must` is `decided`.

Progress `n/m` counts decided depth-1 entries out of all depth-1 entries of that requirement.

**Task done.** Every requirement is done and every check is green. Take check and review state from the sources and the local git state. A fact the agent cannot see counts as not met. Task done changes only the first line; the trees print as usual.

**After task done.** The trees grow until task done; then the user decides whether the task is finished. The skill moves nothing on its own.

- **Finished.** Record the user's answer verbatim as `finished:` in the header. The task is over.
- **Not finished.** Propose exactly the undecided entries from the journal, by id and title; nothing outside the trees. Each entry the user picks gets `must`, which raises the bar for its requirement. Runs go on until the next task done, and the question repeats.

Entries the user moves to `Follow-ups` keep their subtree; the topmost moved entry on each path is a ticket candidate. Record a ticket link only when the user gives one.

## Chat output

Every symbol is defined in [references/output-legend.md](https://github.com/Viperwow/strict-ai/blob/main/strict-workday/skills/strict-leftovers/references/output-legend.md).

```text
## strict-leftovers output

🟧 Stall Open 6 (+3).

Leftovers
1/5 R1 · <requirement title> | Blocked by L4
├─ [ ] 0/1 L1 · <entry title> | medium
│  └─ [ ] 0/1 L1.1 · <entry title> | medium
│     └─ [ ] L1.1.1 · <entry title> | medium · drift
├─ [x] L2 · <entry title>
├─ [ ] L3 · <entry title> | low ▼ critical
├─ [ ] L4 · <entry title> | critical ▲ medium
└─ [ ] L5 · <entry title> | medium · was D1

Later
R1 · <requirement title>
└─ L1 · <entry title>
   └─ [ ] L1.2 · <entry title> | low

Detached
- D2 · <remark, at most 30 words> | user

Tracker data is unavailable.
```

- The first line after the heading is the stall line, `🟧 Stall Open <n> (+<growth>).`, or, when the task is done, `✅ Task Done: please, review the leftovers. Is the task finished?`, which wins over the stall line Neither applies → the output starts at `Leftovers`. One empty line follows it.
- `Leftovers` always prints. Its roots are the requirements; the tree holds `Open` and `Decided` entries in place.
- Every entry shows `[ ]` open or `[x]` decided. A branch adds `<decided children>/<children>` after it, in every tree: `[x] 0/1 L1` is decided with one open child. A requirement shows only the count.
- Each tree counts only the entries it holds. An entry whose children all moved to another tree is a leaf in its own tree, and counts there by its own status.
- Siblings sort by id, ascending.
- Each line reads `<id> · <title>`, then meta after `|`. A requirement's meta is `gate ok` or `Blocked by <ids>`. An open entry's meta is its severity, `▲ <stated>` or `▼ <stated>` when the source labelled it lower or higher, then `must`, `drift`, `was <id>`, and `ticket candidate` when they apply, in that order. A decided entry has no meta.
- `Later`, `Follow-ups`, and `Detached` print only when not empty. `Later` and `Follow-ups` are trees that repeat the full path from the requirement to each moved entry; path nodes show only `<id> · <title>`. In `Follow-ups`, the topmost moved entry on each path carries `ticket candidate`. `Detached` is a flat list: `<id> · <summary of at most 30 words> | <author>`.
- Absence lines come last.
