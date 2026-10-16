# Output legend

Every symbol the chat output may print, and what it means.

## Lines

| Symbol | Meaning |
|---|---|
| `## strict-leftovers output` | Heading. Always the first line. |
| `🟧 Stall Open <n> (+<growth>).` | `Open` has not shrunk for `stallRuns` runs in a row. `<n>` is the current `Open` count; `<growth>` is the change since the previous run. |
| `✅ Task Done: please, review the leftovers. Is the task finished?` | Every requirement is done and every check is green, strictly by the done rules. Replaces the stall line; the trees print as usual. |
| `<Source> data is unavailable.` | `Session`, `PR`, `Tracker`, or `Messenger` is missing or unreachable. The run continued without it. |

## Sections

| Symbol | Meaning |
|---|---|
| `Leftovers` | The main tree. Roots are requirements; open and decided entries sit in place. Always printed. |
| `Later` | Entries the user deferred, each with the full path from its requirement. Printed only when not empty. |
| `Follow-ups` | Entries the user moved out as separate tasks after task done, each with the full path from its requirement. Printed only when not empty. |
| `Detached` | Entries with no link to a requirement. A flat list. Printed only when not empty. |

## Ids

| Symbol | Meaning |
|---|---|
| `R<n>` | A requirement or a DoD criterion. |
| `L<n>` | An entry that grew straight from a requirement (depth 1). Numbered across all requirements. |
| `L<n>.<m>` | A child of `L<n>`. Each level of depth adds one `.<m>`: `L1.2.1` is depth 3. |
| `D<n>` | A detached entry. |

An id keeps its value across `Leftovers`, `Later`, and `Follow-ups`: `L6` stays `L6` in every tree. Only a new parent changes it; the old id stays as `was`.

## Tree

| Symbol | Meaning |
|---|---|
| `├─` `└─` `│` | Tree branches: a child, the last child, a continuing level. |
| `<a>/<b>` | After an entry's checkbox, or on a requirement: `<a>` decided children out of `<b>` children on the level below, counting only children in this tree. On a requirement, progress toward requirement done. |
| `[ ]` | An open entry. |
| `[x]` | A decided entry; on a branch, its children may still be open. |
| `<id> · <title>` | The entry's id and its title, at most 8 words. A `Detached` line carries a summary of at most 30 words instead. |
| `\|` | Meta follows. |
| `<id> · <title>` with no checkbox and no count | A path node in `Later` or `Follow-ups`: context only, not a task. |

## Meta

| Symbol | Meaning |
|---|---|
| `gate ok` | Requirement gate passed: no open `blocker`, `critical`, or `high` in its subtree. |
| `Blocked by <ids>` | Requirement gate failed; these entries hold it. |
| `blocker` `critical` `high` `medium` `low` | Severity the skill assigned by user impact. Definitions: [references/journal-format.md](https://github.com/Viperwow/strict-ai/blob/main/strict-workday/skills/strict-leftovers/references/journal-format.md). |
| `▲ <stated>` | The skill raised the severity above the source's label `<stated>`. |
| `▼ <stated>` | The skill lowered the severity below the source's label `<stated>`. |
| `drift` | The entry sits at `driftDepth` or deeper: far from its requirement. |
| `was <id>` | The entry's previous id, before a new parent changed it. |
| `must` | The user said this entry must close before the task is finished. It joins its requirement's gate. |
| `ticket candidate` | The topmost moved entry on a `Follow-ups` path; the user may turn it into a ticket. |
| `user` / `agent` | Who raised a detached entry. |
