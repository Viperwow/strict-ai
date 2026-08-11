# strict-one-by-one — design

Date: 2026-08-12
Package: `strict-workflows`
Skill: `strict-one-by-one`

## Problem

An assistant given a task tends to batch: ten tests where one was asked for, a dozen functional
changes at once, extra work bolted onto a question. The user loses the ability to inspect any single
change, and scope drifts before the first item is verified.

Existing skills cover the edges of this but not the middle. `strict-dod` fixes the boundary of a task
before work starts. `strict-task-status` answers "where am I, what is the next step". Neither holds the
assistant to one item while the work is running.

## Solution

A queue skill. Requirements are collected from every available source, formalized into numbered items,
frozen by user approval, then executed one item at a time with a stop after each. Items the user does
not want to walk through personally are delegated to agents; their results come back through the same
one-at-a-time review.

## Artifacts

**Queue file:** `.strict-ai/queue/<task-id>.md` — one markdown table, persists across sessions, re-read
before every step. The queue file is the state of record; conversation context is not. Rows are stored
in execution order, so the next item is always the first `queued` row from the top.

`<task-id>` resolves from an explicit argument, then a tracker key, then the branch name, and is
lowercased to kebab-case — path and whitespace characters become `-`, repeats collapse, 60 characters
maximum. With none of the three available, including a detached `HEAD`, it falls back to
`YYYY-MM-DD-<topic>`.

**Ceremony threshold.** Three or fewer `req` rows — tests and gates do not count toward the threshold —
means no queue file, no table, and no registry line. The items are listed in the conversation and
walked one at a time with the same stops, all `manual`, nothing delegated: at that size the file and
the dispatch bookkeeping cost more than the coordination they buy. The trade is that nothing survives a
session restart on this path. A user who wants delegation on a three-item task runs the full path.
Everything below describes the full path.

**Registry:** `.strict-ai/queue/README.md` — one line per queue file, per the repository artifact
storage policy.

### Queue table

| ID | class | Requirement | Source | Links | Files | Mode | Status |
|---|---|---|---|---|---|---|---|
| REQ-01 | req | … | prompt | blocks REQ-03 | `src/a.py` | manual | done |
| REQ-02 | req | … | tracker ABC-12 | relates REQ-04 | `src/b.py` | agent | queued |
| T-01 | test | … | derived | verifies REQ-01 | `tests/test_a.py` | manual | active |
| G-01 | gate | `ruff check` | repo policy | guards REQ-02 | — | manual | queued |

**ID** — one requirement is one item. `REQ-nn` for requirements, `T-nn` for tests, `G-nn` for gates.

**class** — `req`, `test`, or `gate`. `test` and `gate` items are always `manual`; the user cannot
deselect them. A `gate` item carries the command that checks it, and green means that command's exit
status — not a judgement. A safeguard with no runnable check is a `req`, not a `gate`. A gate runs when
its turn comes, like any other item; `guards` places it directly after the item it guards, so it never
runs before there is something to check.

**Source** — where the requirement came from: the prompt, a requirements or documentation service, a
task tracker, or the session context. The skill names no vendor; it resolves whatever integration is
available.

**Links** — tracker-style relations between items: `blocks`, `blocked by`, `relates`, `verifies`,
`guards`. An item with no `blocks` / `blocked by` relation is independent and is a candidate for
delegation. `blocked by` sets the order of the queue; the other relations are information for the
user's selection and change nothing about execution.

**Mode** — `manual` (walked step by step with the user) or `agent` (delegated).

**Status** — `queued`, `active`, `dispatched`, `blocked`, `review`, `done`, `skipped`. `active` is the
manual item in hand; `dispatched` is an agent item in flight, which becomes `review` when the agent
returns.

**Files** — every path the item declares it will edit, recorded at formalization and updated when the
item is announced. A directory entry covers its subtree, and paths are normalized before comparison, so
`src/` and `src/a.py` count as an intersection. Used to keep delegated work off the files the manual
stream is holding.

## Flow

1. **Collect.** Gather requirements from the prompt, a requirements or documentation service, the task
   tracker, and requirements stated in the session context. If `.strict-ai/dod/` holds a DoD for the
   task, its criteria are a source too, resolved the way `strict-dod` resolves it: by task ID first,
   by keyword match against filenames otherwise.
2. **Formalize.** Every source becomes a numbered row. Derive `test` rows for requirements that need
   verification and `gate` rows for safeguards and quality gates. Sort topologically by `blocked by`,
   place a `test` before the requirement it verifies and a `gate` after the item it guards, then write
   the rows in that order, so walking the queue top to bottom never hits an item waiting on a later
   one. A cycle is reported rather than resolved.
3. **Approve.** Present the table. On approval the requirements are frozen — they change only when the
   user explicitly asks for a change. A realization mid-work is not a licence to rewrite a row.
4. **Select.** The user multi-selects which `req` items run `manual`. Unselected `req` items become
   `agent`. `test` and `gate` items are pre-selected and locked to `manual`.
5. **Execute.** Manual items run one at a time. Agent items start only after the queue is confirmed,
   and only on files nothing else holds.

## Item lifecycle

Exactly one item is `active`. Edits touch only the files that item names.

1. Read the queue file, take the first `queued` + `manual` item, set it `active`.
2. Announce: ID, the requirement as written, the files that will be touched.
3. Do the work. One requirement, one test — not a suite of cases per requirement, and no test written
   for a neighbouring requirement along the way. A test and the requirement it verifies are two items
   closing on two turns: the `test` item writes the test and closes red, implementing nothing, because
   a failing test is what proves it tests anything at all; the `req` item comes next and closes when
   that same test runs green.
4. Show the diff and the verification result.
5. Ask via a question prompt: **Next** / **Next ×N** / **Redo** / **Skip** / **Delegate to agent**.
6. Write the status back to the queue file, move to the next item.

**Next ×N** runs the following N items without stopping, then returns to a stop. The user sets the
pace where they are, rather than committing to it upfront. A failed verification or an ambiguity ends
the run early and stops. The default remains a stop after every item.

### Anti-batch rules

- One `active` item at a time. A second item does not open until the first closes.
- A new requirement discovered mid-work is not implemented. It is added as a `queued` row and reported.
- A question from the user is answered as a question. It does not start work.
- Agent results never interleave with the manual stream. They run in the background and surface only
  in the review pass.
- A requirement that turns out to be unworkable goes to `blocked` and is reported. The wording is not
  reinterpreted to fit what is achievable — that is the drift this skill exists to stop. Only the user
  rewrites a requirement.
- Skipping an item sets everything it blocks to `blocked`. Those items are not picked up until the
  blocker closes or the user drops the relation.

## Resuming

An `active` item found at startup means a previous session stopped mid-step. The skill reports the
item and the current diff, and asks: continue it, redo it from a clean tree, or send it back to
`queued`. It never assumes the item is finished.

## Agent dispatch

Agent items run alongside the manual stream, but only on files nothing else holds. An agent item
starts when its `Files` intersect neither the active manual item's files nor any running agent's;
otherwise it waits.

The dispatch carries the item ID, the frozen requirement text, the declared files, and the rule that
work outside those files stops instead of proceeding. The item goes to `dispatched`. The agent returns
its diff and the result of every gate that guards the item, and the item becomes `review`. An agent
that never returns stays `dispatched` and is reported at close as unfinished, for the user to cancel or
take over.

Declared file lists are guesses and will sometimes be wrong. An agent that needs a file outside its
declaration stops rather than taking it, and comes back as a conflict for the user to resolve — take
it over manually, redispatch with a corrected list, or wait for the holder to finish.

## Agent review

Delegated items return as a second queue, walked the same way. On completion an `agent` item takes
status `review`. Review items are processed one at a time with **Accept** / **Return to agent** /
**Take over manually**. The manual stream drains first; the review stream runs after it. The two never
mix.

Before the review stream starts, items whose gates are green and whose diff stays inside the files the
item declared can be accepted in one **Accept all green** action. The offer lists the item IDs it would
close and takes effect only on explicit confirmation; bulk acceptance of agent work is where scope
drift passes unnoticed. Everything else — a red gate, a touched file the item never named, an item with
no gate to be green — is walked one at a time.

## Closing the queue

The queue is finished when nothing is left in `queued`, `active`, `dispatched`, or `review`. The review
stream drains before close — an unreviewed agent item is not a closed one.

The skill reports what closed, what was skipped, and what stayed `blocked`, then appends the registry
line to `.strict-ai/queue/README.md`:

```text
- [<task-id>](<task-id>.md) — <closed>/<total> closed, <n> blocked, <n> skipped · YYYY-MM-DD
```

A queue with anything still `blocked` is reported as unfinished, not as done.

## Packaging

- `strict-workflows/skills/strict-one-by-one/SKILL.md` — single file, no `references/`. The Links
  vocabulary and the rule list are short enough to live inline.
- `.claude-plugin/marketplace.json` — add `strict-workflows`, which now has a skill.
- `README.md` — update the availability note.

`strict-workflows/.claude-plugin/plugin.json` already exists and needs no change.

Trigger: `/strict-one-by-one`, plus a description that catches "one at a time", "step by step", and
"not everything at once".

## Neighbours

`strict-dod` supplies requirements when a DoD file exists. `strict-task-status` stays separate — it
answers where the work stands, not how it is executed.

## Out of scope

- No hook. Enforcement is the queue file plus the rules in `SKILL.md`; a `PreToolUse` block on
  file paths was considered and rejected as false-positive prone.
- No automatic delegation. `Links` marks independence, but the user picks what goes to an agent.
- No worktree isolation for agents. File-list checks are the guard; if they prove too weak in
  practice, a worktree per agent is the upgrade path.
- No automatic activation. The skill runs when invoked or when its description matches; it is not
  wired into repository or global policy files.
