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

## Invocation

~~~text
/strict-gantt [tasks…]                 # draw from session context or inline tasks
/strict-gantt --color [tasks…]         # ANSI-colored bars
/strict-gantt --unit day|week [tasks…] # period unit when dates are used (default: day)
~~~

No tasks in the invocation → collect from session context (plan, backlog, sprint board).
Still missing → ask once for a short task list: name + start + end (or start + duration).

## Task model

Normalize every task to:

| Field | Meaning |
|---|---|
| `name` | Label shown in the first column |
| `start` | Zero-based period index (inclusive) |
| `duration` | Number of periods (≥ 1) |

When the user gives **dates**, convert first:

~~~ts
const dayMs = 24 * 60 * 60 * 1000;

function periodsBetween(projectStart: Date, date: Date, unitDays: number): number {
  return Math.floor((date.getTime() - projectStart.getTime()) / (dayMs * unitDays));
}
~~~

- `--unit day` → `unitDays = 1`
- `--unit week` → `unitDays = 7`
- `projectStart` = earliest task start date
- `duration` = `periodsBetween(projectStart, end) - periodsBetween(projectStart, start)` (clamp to ≥ 1; treat end as exclusive if the user gives end-of-day ranges)

Period indexes already provided → use as-is. Do not invent dependencies or reorder tasks unless asked; preserve input order.

## Render algorithm

1. `totalPeriods = max(start + duration)` across tasks. Cap display width: if `totalPeriods > 31`, switch header labels to every other period (still paint every cell).
2. `nameWidth = max(name lengths, header label length) + 2`. Header label default: `Task` (or the user's language: `Задача` when the conversation is Russian).
3. Header row: padded name label + period labels (`01 02 …`), space-separated.
4. Separator: `─` repeated to header length.
5. Each task row: `name.padEnd(nameWidth)` + cells joined by a single space:
   - active period → `██` (monochrome) or ANSI block (`--color`)
   - inactive → two spaces `  `
6. Print inside a fenced ` ```text ` block so alignment survives chat rendering.

Full reference implementation: `references/draw-gantt.md`.

## Color mode (`--color`)

Use a small rotating palette of background ANSI codes for active cells; reset after each cell. Inactive stays `  `.

~~~ts
const palette = ["\x1b[42m  \x1b[0m", "\x1b[44m  \x1b[0m", "\x1b[45m  \x1b[0m", "\x1b[46m  \x1b[0m"];
// task i → palette[i % palette.length] when active
~~~

Only enable when the user asked for color or passed `--color`. Default is monochrome `██` — safer for logs and markdown.

## Output contract

Always emit:

1. One-line summary: period unit, range (indexes or dates), task count.
2. The chart in a ` ```text ` fence.
3. Optional notes only when useful: overlaps, zero-duration clamps, truncated long names (> 40 chars → truncate with `…`).

Do **not** write files unless the user asks. Do **not** open FigJam/diagram tools — this skill is console/text only.

## Example

Input tasks:

~~~ts
[
  { name: "Analysis", start: 0, duration: 3 },
  { name: "Design", start: 2, duration: 3 },
  { name: "Development", start: 4, duration: 4 },
  { name: "Testing", start: 8, duration: 2 },
]
~~~

Output:

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
| Using cards/tables instead of a monospace chart | Always use a ` ```text ` fence with fixed-width cells |
| Mixing date strings into the bar grid | Convert dates → period offsets first |
| End-inclusive duration off-by-one | Prefer half-open `[start, start+duration)` |
| Coloring by default | Color only with `--color` |
| Reordering by start date silently | Keep input order; offer a sorted redraw only if asked |
