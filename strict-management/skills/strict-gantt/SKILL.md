---
name: strict-gantt
description: >
  Draw ASCII/console Gantt charts for project schedules, sprint plans, or task
  timelines. Use when the user asks for a Gantt chart, timeline visualization,
  schedule overview, dependency overview, or period-based task bars in text or
  console. Accepts period indexes or real dates; shows weekday row; marks leave
  and weekends; always prints a legend; optional ANSI color bars. Triggers on
  /strict-gantt.
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
Still missing → ask once for: resource, work name, start + end (or start + duration).
Ask for leave ranges and which weekday period 0 is (default Monday) when the calendar matters.

## Chart layout (required)

Two header rows above the separator, then task rows, then the legend:

~~~text
Ресурс | Работа (дни)  01 02 03 04 05 06 07 08 09 10
                       Пн Вт Ср Чт Пт Сб Вс Пн Вт Ср
────────────────────────────────────────────────────
Я      | 31,32 эпики   ██
Я      | B1a,B1b …        ██
~~~

| Part | Rule |
|---|---|
| Left columns | `Resource \| Work` — pad each side; English defaults `Resource \| Work (days)`, Russian `Ресурс \| Работа (дни)` |
| Row 1 | Date / period numbers (`01 02 …`) |
| Row 2 | Weekday abbreviations under every period (`Пн Вт …` / `Mo Tu …`) |
| Separator | `─` to the width of row 1 |
| Body | One row per task: `resource \| name` + cells |
| Footer | **Always** the legend (never omit) |

Locale: `--locale en|ru` (Russian when the conversation is Russian).
Weekday of period 0: `--week-start 0..6` (Mon=0 … Sun=6, default `0`).
With a real `projectStart` date, use `weekStartFromDate(projectStart)`.

## Legend (required)

Always append under the chart, inside the same ` ```text ` fence:

| Glyph | Meaning |
|---|---|
| `██` | Planned work |
| `▒▒` | Leave / vacation |
| `▓▓` | Weekend |

- `en`: `Legend: ██ planned work, ▒▒ leave, ▓▓ weekend`
- `ru`: `Легенда: ██ работа по плану, ▒▒ отпуск, ▓▓ выходные`

## Task model

Normalize every task to `{ resource?, name, start, duration, kind? }`:

| Field | Meaning |
|---|---|
| `resource` | Left column (person/team). Empty string if unknown |
| `name` | Work label |
| `start` | Zero-based period index (inclusive) |
| `duration` | Number of periods (≥ 1) |
| `kind` | `work` (default) or `leave` |

When the user gives **dates**, convert with `tasksFromDates` / `periodsBetween` from `scripts/draw-gantt.ts`:

- `--unit day` → `unitDays = 1`
- `--unit week` → `unitDays = 7`
- `end` is exclusive; if the user gives inclusive end dates, add one unit before converting
- Period indexes already provided → use as-is

**Weekends:** default from `weekStart` via `weekendPeriodsFromWeekStart` (Sat/Sun). Override with `weekends[]` / `--weekends 5,6`. With real dates and `--unit day`, use `weekendPeriods(projectStart, totalPeriods, 1)`.

Cell priority per period: **leave → weekend → work → empty** (leave stays visible on weekend columns; empty weekend cells still show `▓▓`).

Do not invent dependencies or reorder tasks unless asked; preserve input order.

## How to draw

1. Build a `Task[]` (dates → offsets first when needed); set `weekStart` / `weekends`.
2. Prefer the skill script — from this skill directory:
   ~~~bash
   npx --yes tsx scripts/draw-gantt.ts --locale ru
   echo '{"tasks":[{"resource":"Я","name":"A","start":0,"duration":2}],"weekStart":0}' \
     | npx --yes tsx scripts/draw-gantt.ts --locale ru
   npx --yes tsx scripts/draw-gantt.ts --color --locale en
   ~~~
   Or call `drawGantt(tasks, { locale, color, weekends, weekStart })` and paste the return value.
3. Wrap the **full chart including weekday row and legend** in one ` ```text ` fence.

Color only when the user asked or passed `--color`. Default is monochrome glyphs.

## Output contract

Always emit:

1. One-line summary: period unit, range (indexes or dates), task count.
2. The chart (date row + weekday row + body + legend) in a ` ```text ` fence.
3. Optional notes only when useful: overlaps, zero-duration clamps, truncated long names (> 40 chars → truncate with `…`).

Do **not** write files unless the user asks. Do **not** open FigJam/diagram tools — this skill is console/text only.

## Example

`npx --yes tsx scripts/draw-gantt.ts --locale ru`:

~~~text
Ресурс | Работа (дни)         01 02 03 04 05 06 07 08 09
                              Пн Вт Ср Чт Пт Сб Вс Пн Вт
────────────────────────────────────────────────────────
Я      | 31,32 эпики          ██             ▓▓ ▓▓
Я      | B1a,B1b своя (эпик)     ██          ▓▓ ▓▓
Я      | B2a,B2b своя (эпик)        ██       ▓▓ ▓▓
Я      | 36 старт                      ██    ▓▓ ▓▓
Я      | 36,37,38                         ██ ▓▓ ▓▓
Я      | Отпуск                              ▒▒ �                      ██    ▓▓ ▓▓
Я      | 36,37,38                         ██ ▓▓ ▓▓
Я      | Отпуск                              ▒▒ ▒▒
Я      | продолжение                         ▓▓ ▓▓ ██ ██

Легенда: ██ работа по плану, ▒▒ отпуск, ▓▓ выходные
~~~

## Common mistakes

| Mistake | Fix |
|---|---|
| Reimplementing the bar grid from scratch | Use `scripts/draw-gantt.ts` |
| Omitting the weekday row | Always print abbreviations under period numbers |
| Omitting the legend | Always print the three-glyph legend under the table |
| Single name column only | Use `Resource \| Work` left columns |
| Using cards/tables instead of a monospace chart | Always use a ` ```text ` fence |
| Mixing date strings into the bar grid | Convert dates → period offsets first |
| End-inclusive duration off-by-one | Half-open `[start, start+duration)` |
| Painting leave as `██` | Set `kind: "leave"` → `▒▒` |
| Coloring by default | Color only with `--color` |
| Reordering by start date silently | Keep input order; offer a sorted redraw only if asked |
