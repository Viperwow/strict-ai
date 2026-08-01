---
name: strict-gantt
description: >
  Draw ASCII/console Gantt charts for project schedules, sprint plans, or task
  timelines. Use when the user asks for a Gantt chart, timeline visualization,
  schedule overview, dependency overview, or period-based task bars in text or
  console. Accepts period indexes or real dates; marks leave and weekends;
  optional ANSI color bars. Triggers on /strict-gantt.
---

# strict-gantt

Render a text Gantt chart in chat (or console) so a schedule is scannable at a glance.

**Canonical script:** `scripts/draw-gantt.ts` — prefer running or adapting it over reinventing the renderer.

## Invocation

~~~text
/strict-gantt [tasks…]                 # draw from session context or inline tasks
/strict-gantt --color [tasks…]         # ANSI-colored bars
/strict-gantt --unit day|week [tasks…] # period unit when dates are used (default: day)
~~~

No tasks in the invocation → collect from session context (plan, backlog, sprint board).
Still missing → ask once for a short task list: name + start + end (or start + duration).
Ask for leave ranges and the calendar start when weekends matter.

## Legend (required)

Always append the legend under the chart (inside the same ` ```text ` fence or on the next line in that fence):

| Glyph | Meaning |
|---|---|
| `██` | Planned work |
| `▒▒` | Leave / vacation |
| `▓▓` | Weekend |

- English: `Legend: ██ planned work, ▒▒ leave, ▓▓ weekend`
- Russian (conversation in Russian, or header `Задача`): `Легенда: ██ работа по плану, ▒▒ отпуск, ▓▓ выходные`

Script flag: `--legend en|ru` (auto: `ru` when `--header Задача`, else `en`).

## Task model

Normalize every task to `{ name, start, duration, kind? }`:

| Field | Meaning |
|---|---|
| `name` | Label shown in the first column |
| `start` | Zero-based period index (inclusive) |
| `duration` | Number of periods (≥ 1) |
| `kind` | `work` (default) or `leave` |

When the user gives **dates**, convert with `tasksFromDates` / `periodsBetween` from `scripts/draw-gantt.ts`:

- `--unit day` → `unitDays = 1`
- `--unit week` → `unitDays = 7`
- `end` is exclusive; if the user gives inclusive end dates, add one unit before converting
- Period indexes already provided → use as-is

**Weekends:** pass period indexes in `weekends` (CLI `--weekends 5,6`). With real dates and `--unit day`, derive them via `weekendPeriods(projectStart, totalPeriods, 1)` (Sat/Sun).

Cell priority per period: **weekend → leave → work → empty**.

Do not invent dependencies or reorder tasks unless asked; preserve input order.

## How to draw

1. Build a `Task[]` (dates → offsets first when needed) and optional `weekends[]`.
2. Prefer the skill script:
   - **Terminal / verification:** run from this skill directory:
     ~~~bash
     npx --yes tsx scripts/draw-gantt.ts
     echo '{"tasks":[{"name":"A","start":0,"duration":2},{"name":"Off","start":2,"duration":2,"kind":"leave"}],"weekends":[5,6]}' \
       | npx --yes tsx scripts/draw-gantt.ts --header Task
     npx --yes tsx scripts/draw-gantt.ts --color --legend ru --header Задача
     ~~~
   - **Chat output:** call `drawGantt(tasks, { nameHeader, color, weekends, legend })` (read the script, or run it and paste stdout).
3. Wrap the chart **and legend** in a fenced ` ```text ` block so alignment survives chat rendering.
4. Header label default: `Task` (or `Задача` when the conversation is Russian — pass `--header` / `nameHeader`).

Color only when the user asked or passed `--color`. Default is monochrome glyphs.

## Output contract

Always emit:

1. One-line summary: period unit, range (indexes or dates), task count.
2. The chart **plus legend** in a ` ```text ` fence.
3. Optional notes only when useful: overlaps, zero-duration clamps, truncated long names (> 40 chars → truncate with `…`).

Do **not** write files unless the user asks. Do **not** open FigJam/diagram tools — this skill is console/text only.

## Example

Demo from `scripts/draw-gantt.ts` (leave task + weekends on periods 6–7):

~~~text
Task         01 02 03 04 05 06 07 08 09 10 11
─────────────────────────────────────────────
Analysis     ██ ██ ██          ▓▓ ▓▓
Design             ██ ██ ██    ▓▓ ▓▓
Leave                    ▒▒ ▒▒ ▓▓ ▓▓
Development                 ██ ▓▓ ▓▓ ██
Testing                        ▓▓ ▓▓    ██ ██

Legend: ██ planned work, ▒▒ leave, ▓▓ weekend
~~~

## Common mistakes

| Mistake | Fix |
|---|---|
| Reimplementing the bar grid from scratch | Use `scripts/draw-gantt.ts` |
| Omitting the legend | Always print the three-glyph legend |
| Using cards/tables instead of a monospace chart | Always use a ` ```text ` fence |
| Mixing date strings into the bar grid | Convert dates → period offsets first |
| End-inclusive duration off-by-one | Half-open `[start, start+duration)` |
| Painting leave as `██` | Set `kind: "leave"` → `▒▒` |
| Forgetting weekend columns on day charts | Pass `weekends` or use `weekendPeriods` |
| Coloring by default | Color only with `--color` |
| Reordering by start date silently | Keep input order; offer a sorted redraw only if asked |
