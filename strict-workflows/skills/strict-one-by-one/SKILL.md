---
name: strict-one-by-one
description: Execute a task one requirement at a time instead of in a batch. Collects requirements from every available source, formalizes them into a numbered queue, freezes them on approval, then walks the selected items one by one with a stop after each; the rest go to agents and come back through the same review. Use when work must go one at a time, step by step, not everything at once — when a task has several requirements, or when batched output needs to be broken into single verifiable steps. Triggers on /strict-one-by-one.
---

# strict-one-by-one

One item in hand at a time. Requirements are frozen once approved. Nothing extra ships along the way.

## Artifacts

This skill writes `.strict-ai/queue/`:

- `<task-id>.md` — one queue, created at formalization on the full path.
- `README.md` — the registry, one line per queue file, appended when a queue closes.

## Queue file

`.strict-ai/queue/<task-id>.md` — the state of record. Conversation context is not. Re-read it before
every step and write the status back after every step. Rows are stored in execution order, so the next
item is always the first `queued` row from the top.

`<task-id>` — an explicit argument wins, then a tracker key, then the current branch name. Whatever the
source, it is lowercased and reduced to kebab-case: `/` and any other path or whitespace character
become `-`, repeated `-` collapse, and the result is truncated to 60 characters. With no argument, no
tracker key, and no branch — detached `HEAD` included — use `YYYY-MM-DD-<topic>`.

**Ceremony threshold:** three or fewer `req` rows — tests and gates do not count — means no file, no
table, and no registry line. The items live in the conversation and are walked with the same stops, all
`manual`, nothing delegated: with so few items the queue file costs more than the coordination it
buys. Nothing survives a session restart on this path; a stopped item is re-stated by the user or the
skill is re-run on the full path.

### Table

| ID | class | Requirement | Source | Links | Files | Mode | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| T-01 | test | … | derived | verifies REQ-01 | `tests/test_a.py` | manual | done |
| REQ-01 | req | … | prompt | blocks REQ-03 | `src/a.py` | manual | active |
| REQ-02 | req | … | tracker ABC-12 | relates REQ-04 | `src/b.py` | agent | queued |
| G-01 | gate | `ruff check` | repo policy | guards REQ-02 | — | manual | queued |

**ID** — one requirement is one item. `REQ-nn`, `T-nn` for tests, `G-nn` for gates.

**class** — `req`, `test`, or `gate`. A `gate` carries the command that checks it; green is that
command's exit status, not a judgement. A safeguard with no runnable check is a `req`, not a `gate`. A
gate runs when its turn comes, like any other item — `guards` places it directly after the item it
guards, so it never runs before there is something to check.

**Source** — the prompt, a requirements or documentation service, a task tracker, or the session
context. Resolve whatever integration is available; name no vendor.

**Links** — `blocks`, `blocked by`, `relates`, `verifies`, `guards`. `blocked by` sets queue order. The
other relations are information for the user's selection and change nothing about execution.

**Files** — every path the item will edit, recorded at formalization and updated when the item is
announced. A directory entry covers its whole subtree, and paths are normalized before they are
compared, so `src/` and `src/a.py` count as an intersection. Keeps delegated work off files the manual
stream holds.

**Mode** — `manual` (walked with the user) or `agent` (delegated). `test` and `gate` are always
`manual` and cannot be deselected.

**Status** — `queued`, `active`, `dispatched`, `blocked`, `review`, `done`, `skipped`. `active` is the
manual item in hand. `dispatched` is an agent item in flight, and becomes `review` when it returns.

## Flow

1. **Collect.** Requirements from the prompt, a requirements or documentation service, the tracker, and
   requirements stated in the session context. A DoD in `.strict-ai/dod/` is a source too — resolve it
   the way `strict-dod` does, by task ID first and by keyword match against filenames otherwise.
2. **Formalize.** Every source becomes a numbered row. Derive `test` rows for requirements that need
   verification and `gate` rows for safeguards and quality gates. Sort topologically by `blocked by`,
   place a `test` before the requirement it verifies and a `gate` after the item it guards, then write
   the rows in that order. Report a cycle, do not resolve it.
3. **Approve.** Present the table and wait. On approval the requirements are frozen.
4. **Select.** The user picks which `req` items run `manual`; the rest become `agent`. `test` and
   `gate` items are pre-selected and locked.
5. **Execute.** Manual items one at a time. Agent items start after the queue is confirmed, and only on
   files nothing else holds.

## Item lifecycle

Exactly one item is `active`. Edits touch only the files that item names.

1. Read the queue file — or the conversation list below the ceremony threshold — take the first
   `queued` + `manual` item whose every `blocked by` is `done`, set it `active`. An item in `blocked`
   is never picked up, and neither is one whose blocker is still open.
2. Announce: ID, the requirement as written, the files that will be touched.
3. Do the work. One requirement, one test — not a suite of cases per requirement, and no test for a
   neighbouring requirement along the way.

   A test and its requirement are two items, and they close in two turns. The `test` item writes the
   test and closes **red**: a failing test is what proves it tests anything, so no implementation
   happens on this turn. The `req` item it verifies comes next and closes when that same test runs
   green.
4. Show the diff and the verification result.
5. Ask for one of **Next** / **Next ×N** / **Redo** / **Skip** / **Delegate to agent**.
6. Write the status back, move on.

**Next ×N** runs the following N items without stopping, then returns to a stop. A failed verification
or an ambiguity ends the run early. The default is a stop after every item.

## Rules

- One `active` item at a time. A second does not open until the first closes.
- A set of options is offered through whatever choice affordance the environment provides — a built-in
  selection prompt where one exists, a numbered list otherwise — in the form the step calls for: one
  answer for **Next** / **Redo** / **Skip**, several for picking `manual` items at selection.
- A new requirement found mid-work is not implemented and does not enter the queue on its own. Record
  it as a proposal, report it, and leave it unexecutable until the user approves it. On approval it
  becomes a row, is placed by the ordering rules, and goes through selection like any other.
- A question is answered as a question. It does not start work.
- Agent results never interleave with the manual stream. They surface only in the review pass.
- A requirement that turns out to be unworkable goes to `blocked` and is reported. Never reinterpret
  the wording to fit what is achievable. Only the user rewrites a requirement.
- Skipping an item sets everything it blocks to `blocked`, untouched until the blocker closes or the
  user drops the relation.

## Agent dispatch

An agent item starts when its `Files` intersect no file any `manual` item declares — queued ones
included, not just the active one — and no running agent's files. The manual stream owns its declared
paths for the whole run; an agent that edits a file a later manual item is waiting on hands that item a
tree it never saw. Otherwise the agent item waits.

The dispatch carries the item ID, the frozen requirement text, the declared files, and the rule that
work outside those files stops instead of proceeding. Set the item `dispatched` when it goes out. The
agent returns its diff and the result of every gate that guards the item; on return the item becomes
`review`. An agent that never returns stays `dispatched` and is reported at close as unfinished — the
user cancels it or takes it over manually.

Declared file lists are guesses and will sometimes be wrong. An agent that needs a file outside its
declaration stops rather than taking it and returns as a conflict: take it over manually, redispatch
with a corrected list, or wait for the holder to finish.

## Agent review

The manual stream drains first, then the review stream. They never mix.

Items whose gates are green and whose diff stayed inside the declared files can be taken in one
**Accept all green** action. It is offered with the item IDs it would close listed in full and takes
effect only on explicit confirmation — bulk acceptance of agent work is where scope drift passes
unnoticed. Everything else — a red gate, a file the item never named, an item with no gate to be green
— is walked one at a time with **Accept** / **Return to agent** / **Take over manually**.

## Resuming

An `active` item at startup means a previous session stopped mid-step. Report the item and the current
diff, then ask: continue, redo from a clean tree, or return to `queued`. Never assume it finished.

A `dispatched` item at startup has no agent behind it any more — the run that owned it is gone. Report
it with whatever its files show and ask: redispatch, take it over manually, or return it to `queued`.
Never leave it `dispatched`, or the queue waits on something that will never return.

## Closing

The queue is finished when nothing is left in `queued`, `active`, `dispatched`, or `review`. The review
stream drains before close; an unreviewed agent item is not a closed one.

Report what closed, what was skipped, and what stayed `blocked`, then append the registry line to
`.strict-ai/queue/README.md`:

```text
- [<task-id>](<task-id>.md) — <closed>/<total> closed, <n> blocked, <n> skipped · YYYY-MM-DD
```

A queue with anything still `blocked` is reported as unfinished, not done.
