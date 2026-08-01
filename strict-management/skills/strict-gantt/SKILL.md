---
name: strict-gantt
description: >
  Draw ASCII/console Gantt charts for project schedules, sprint plans, or task
  timelines. Use when the user asks for a Gantt chart, timeline visualization,
  schedule overview, dependency overview, or period-based task bars in text or
  console. Accepts period indexes or real dates; optional ANSI color bars.
  Triggers on /strict-gantt.
---

# strict-gantt

Render a text Gantt chart in chat (or console) so a schedule is scannable at a glance.

**Reference script:** `references/draw-gantt.ts` — canonical algorithm. Prefer running or adapting it over reinventing the renderer.

## Invocation

~~~text
/strict-gantt [tasks…]                 # draw from session context or inline tasks
/strict-gantt --color [tasks…]         # ANSI-colored bars
/strict-gantt --unit day|week [tasks…] # period unit when dates are used (default: day)
~~~

No tasks in the invocation → collect from session context (plan, backlog, sprint board).
Still missing → ask once for a short task list: name + start + end (or start + duration).

## Task model

Normalize every task to `{ name, start, duration }`:

| Field | Meaning |
|---|---|
| `name` | Label shown in the first column |
| `start` | Zero-based period index (inclusive) |
| `duration` | Number of periods (≥ 1) |

When the user gives **dates**, convert with `tasksFromDates` / `periodsBetween` from `references/draw-gantt.ts`:

- `--unit day` → `unitDays = 1`
- `--unit week` → `unitDays = 7`
- `end` is exclusive; if the user gives inclusive end dates, add one unit before converting
- Period indexes already provided → use as-is

Do not invent dependencies or reorder tasks unless asked; preserve input order.

## How to draw

1. Build a `Task[]` (dates → offsets first when needed).
2. Prefer the reference script:
   - **Terminal / verification:** run from this skill directory:
     ~~~bash
     npx --yes tsx references/draw-gantt.ts
     echo '[{"name":"A","start":0,"duration":2}]' | npx --yes tsx references/draw-gantt.ts --header Task
     npx --yes tsx references/draw-gantt.ts --color
     ~~~
   - **Chat output:** call `drawGantt(tasks, { nameHeader, color })` (read the script, or run it and paste stdout).
3. Wrap the chart in a fenced ` ```text ` block so alignment survives chat rendering.
4. Header label default: `Task` (or `Задача` when the conversation is Russian — pass `--header` / `nameHeader`).

Color only when the user asked or passed `--color`. Default is monochrome `██`.

## Output contract

Always emit:

1. One-line summary: period unit, range (indexes or dates), task count.
2. The chart in a ` ```text ` fence.
3. Optional notes only when useful: overlaps, zero-duration clamps, truncated long names (> 40 chars → truncate with `…`).

Do **not** write files unless the user asks. Do **not** open FigJam/diagram tools — this skill is console/text only.

## Example

Input → `drawGantt` (see demo tasks in `references/draw-gantt.ts`):

~~~text
Task            01 02 03 04 05 06 07 08 09 10
─────────────────────────────────────────────
Analysis        ██ ██ ██
Design                ██ ██ ██
Development                 ██ ██ ██ ██
Testing                                 ██ ██
~~~

## Common mistakes

| Mistake | Fix |
|---|---|
| Reimplementing the bar grid from scratch | Use `references/draw-gantt.ts` |
| Using cards/tables instead of a monospace chart | Always use a ` ```text ` fence |
| Mixing date strings into the bar grid | Convert dates → period offsets first |
| End-inclusive duration off-by-one | Half-open `[start, start+duration)` |
| Coloring by default | Color only with `--color` |
| Reordering by start date silently | Keep input order; offer a sorted redraw only if asked |
