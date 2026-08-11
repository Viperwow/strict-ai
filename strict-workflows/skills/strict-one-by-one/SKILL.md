---
name: strict-one-by-one
description: Execute a task one requirement at a time instead of in a batch. Collects requirements from every available source, formalizes them into a numbered queue, freezes them on approval, then walks the selected items one by one with a stop after each; the rest go to agents and come back through the same review. Use when work must go step by step, when a task has several requirements, or when batched output needs to be broken into single verifiable steps. Triggers on /strict-one-by-one.
---

# strict-one-by-one

One item in hand at a time. Requirements are frozen once approved. Nothing extra ships along the way.

## Queue file

`.strict-ai/queue/<task-id>.md` — the state of record. Conversation context is not. Re-read it before
every step and write the status back after every step.

`<task-id>` defaults to the current branch name. A tracker key or an explicit argument overrides it.

**Ceremony threshold:** three or fewer `req` rows — tests and gates do not count — means no file and no
table. List the items in the conversation and walk them with the same stops, all `manual`, nothing
delegated.

### Table

| ID | class | Requirement | Source | Links | Files | Mode | Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| REQ-01 | req | … | prompt | blocks REQ-03 | `src/a.py` | manual | done |
| REQ-02 | req | … | tracker ABC-12 | relates REQ-04 | `src/b.py` | agent | queued |
| T-01 | test | … | derived | verifies REQ-01 | `tests/test_a.py` | manual | active |
| G-01 | gate | `ruff check` | repo policy | guards REQ-02 | — | manual | queued |

**ID** — one requirement is one item. `REQ-nn`, `T-nn` for tests, `G-nn` for gates.

**class** — `req`, `test`, or `gate`. A `gate` carries the command that checks it; green is that
command's exit status, not a judgement. A safeguard with no runnable check is a `req`, not a `gate`.

**Source** — the prompt, a requirements or documentation service, a task tracker, or the session
context. Resolve whatever integration is available; name no vendor.

**Links** — `blocks`, `blocked by`, `relates`, `verifies`, `guards`. `blocked by` sets queue order. The
other relations are information for the user's selection and change nothing about execution.

**Files** — what the item will touch. Recorded at formalization, updated when the item is announced.
Keeps delegated work off files the manual stream holds.

**Mode** — `manual` (walked with the user) or `agent` (delegated). `test` and `gate` are always
`manual` and cannot be deselected.

**Status** — `queued`, `active`, `dispatched`, `blocked`, `review`, `done`, `skipped`. `active` is the
manual item in hand. `dispatched` is an agent item in flight, and becomes `review` when it returns.

## Flow

1. **Collect.** Requirements from the prompt, a requirements or documentation service, the tracker, and
   requirements stated in the session context. A DoD file in `.strict-ai/dod/` for this task is a
   source too.
2. **Formalize.** Every source becomes a numbered row. Derive `test` rows for requirements that need
   verification and `gate` rows for safeguards and quality gates. Order a `test` before the requirement
   it verifies, then sort topologically by `blocked by`. Report a cycle, do not resolve it.
3. **Approve.** Present the table and wait. On approval the requirements are frozen.
4. **Select.** The user picks which `req` items run `manual`; the rest become `agent`. `test` and
   `gate` items are pre-selected and locked.
5. **Execute.** Manual items one at a time. Agent items start after the queue is confirmed, and only on
   files nothing else holds.

## Item lifecycle

Exactly one item is `active`. Edits touch only the files that item names.

1. Read the queue file, take the first `queued` + `manual` item, set it `active`.
2. Announce: ID, the requirement as written, the files that will be touched.
3. Do the work. One requirement, one test — not a suite of cases per requirement, and no test for a
   neighbouring requirement along the way. A `test` item closes red: it must fail before the
   requirement it verifies is implemented, which is what proves it tests anything.
4. Show the diff and the verification result.
5. Ask with a multiple-choice prompt: **Next** / **Next ×N** / **Redo** / **Skip** / **Delegate to
   agent**.
6. Write the status back, move on.

**Next ×N** runs the following N items without stopping, then returns to a stop. A failed verification
or an ambiguity ends the run early. The default is a stop after every item.

## Rules

- One `active` item at a time. A second does not open until the first closes.
- A new requirement found mid-work is not implemented. Add a `queued` row and report it.
- A question is answered as a question. It does not start work.
- Agent results never interleave with the manual stream. They surface only in the review pass.
- A requirement that turns out to be unworkable goes to `blocked` and is reported. Never reinterpret
  the wording to fit what is achievable. Only the user rewrites a requirement.
- Skipping an item sets everything it blocks to `blocked`, untouched until the blocker closes or the
  user drops the relation.

## Agent dispatch

An agent item starts when its `Files` intersect neither the active manual item's files nor any running
agent's. Otherwise it waits.

Declared file lists are guesses and will sometimes be wrong. An agent that needs a file outside its
declaration stops rather than taking it and returns as a conflict: take it over manually, redispatch
with a corrected list, or wait for the holder to finish.

## Agent review

The manual stream drains first, then the review stream. They never mix.

Items whose gates are green and whose diff stayed inside the declared files can be taken in one
**Accept all green** action. Everything else — a red gate, a file the item never named — is walked one
at a time with **Accept** / **Return to agent** / **Take over manually**.

## Resuming

An `active` item at startup means a previous session stopped mid-step. Report the item and the current
diff, then ask: continue, redo from a clean tree, or return to `queued`. Never assume it finished.

## Closing

No `queued`, `active`, or `dispatched` items left means the queue is finished. Report what closed, what
was skipped, and what stayed `blocked`, then write the registry line in `.strict-ai/queue/README.md`. A
queue with anything still `blocked` is unfinished, not done.
