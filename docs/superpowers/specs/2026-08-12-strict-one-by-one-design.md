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
before every step. The queue file is the state of record; conversation context is not.

**Registry:** `.strict-ai/queue/README.md` — one line per queue file, per the repository artifact
storage policy.

### Queue table

| ID | class | Requirement | Source | Links | Mode | Status |
|---|---|---|---|---|---|---|
| REQ-01 | req | … | prompt | blocks REQ-03 | manual | done |
| REQ-02 | req | … | tracker ABC-12 | relates REQ-04 | agent | queued |
| T-01 | test | … | derived | verifies REQ-01 | manual | active |
| G-01 | gate | … | repo policy | guards REQ-02 | manual | queued |

**ID** — one requirement is one item. `REQ-nn` for requirements, `T-nn` for tests, `G-nn` for gates.

**class** — `req`, `test`, or `gate`. `test` and `gate` items are always `manual`; the user cannot
deselect them.

**Source** — where the requirement came from: the prompt, a requirements or documentation service, a
task tracker, or the session context. The skill names no vendor; it resolves whatever integration is
available.

**Links** — tracker-style relations between items: `blocks`, `blocked by`, `relates`, `verifies`,
`guards`. An item with no `blocks` / `blocked by` relation is independent and is a candidate for
delegation. Links inform the user's selection; they do not reorder execution.

**Mode** — `manual` (walked step by step with the user) or `agent` (delegated).

**Status** — `queued`, `active`, `review`, `done`, `skipped`.

## Flow

1. **Collect.** Gather requirements from the prompt, a requirements or documentation service, the task
   tracker, and requirements stated in the session context. If `.strict-ai/dod/` holds a DoD for the
   task, its criteria are a source too.
2. **Formalize.** Every source becomes a numbered row. Derive `test` rows for requirements that need
   verification and `gate` rows for safeguards and quality gates.
3. **Approve.** Present the table. On approval the requirements are frozen — they change only when the
   user explicitly asks for a change. A realization mid-work is not a licence to rewrite a row.
4. **Select.** The user multi-selects which `req` items run `manual`. Unselected `req` items become
   `agent`. `test` and `gate` items are pre-selected and locked to `manual`.
5. **Execute.** Manual items run one at a time. Agent items start only after the queue is confirmed.

## Item lifecycle

Exactly one item is `active`. Edits touch only the files that item names.

1. Read the queue file, take the first `queued` + `manual` item, set it `active`.
2. Announce: ID, the requirement as written, the files that will be touched.
3. Do the work. One requirement, one test — not a suite of cases per requirement, and no test written
   for a neighbouring requirement along the way.
4. Show the diff and the verification result.
5. Ask via a question prompt: **Next** / **Redo** / **Skip** / **Delegate to agent**.
6. Write the status back to the queue file, move to the next item.

### Anti-batch rules

- One `active` item at a time. A second item does not open until the first closes.
- A new requirement discovered mid-work is not implemented. It is added as a `queued` row and reported.
- A question from the user is answered as a question. It does not start work.
- Agent items never interleave with the manual stream.

## Agent review

Delegated items return as a second queue, walked the same way. On completion an `agent` item takes
status `review`. Review items are processed one at a time with **Accept** / **Return to agent** /
**Take over manually**. The manual stream drains first; the review stream runs after it. The two never
mix.

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
- No automatic parallel dispatch. `Links` marks independence; the user decides what is delegated.
