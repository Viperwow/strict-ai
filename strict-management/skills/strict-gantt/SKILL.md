---
name: strict-gantt
description: >
  Draw ASCII/console Gantt charts for project schedules, sprint plans, or task
  timelines. Use when the user asks for a Gantt chart, timeline visualization,
  schedule overview, dependency overview, or period-based task bars in text or
  console. Accepts period indexes or real dates; shows weekday row; marks leave
  and weekends; always prints a legend; expands abbreviations at least once;
  optional ANSI color bars. Triggers on /strict-gantt.
---

# strict-gantt

Render a text Gantt chart in chat (or console) so a schedule is scannable at a glance.

**Canonical script:** `scripts/draw-gantt.ts` — prefer running or adapting it over reinventing the renderer.

Script UI is **English only** (headers, weekdays, legend, key). Row labels may be whatever the user provided.

## Invocation

~~~text
/strict-gantt [tasks…]                 # draw from session context or inline tasks
/strict-gantt --color [tasks…]         # ANSI-colored bars
/strict-gantt --unit day|week [tasks…] # period unit when dates are used (default: day)
~~~

No tasks in the invocation → collect from session context (plan, backlog, sprint board).
Still missing → ask once for: resource, short label, start + end (or start + duration).
Ask for leave ranges and which weekday period 0 is (default Monday) when the calendar matters.

## Work (days) column

Header is **`Resource | Work (days)`**. Cells stay short (ids / 1–2 words / abbreviations) — the header name does not mean long work titles in the grid.

Each cell is one of:

| Form | Example | Rule |
|---|---|---|
| Task id / ref | `31,32` · `PROJ-12` | Prefer tracker ids when known |
| 1–2 words | `36 start` · `follow-up` | Keep tight — no sentences |
| Abbreviation | `B1a,B1b` | **Expand at least once** in a `Key:` block under the chart |

Never put long titles or epic prose in the grid. Put expansions in `glossary` / `Key:`, not in the cell.

## Chart layout (required)

~~~text
Resource | Work (days)  01 02 03 04 05 06 07 08 09 10
                        Mo Tu We Th Fr Sa Su Mo Tu We
────────────────────────────────────────────────────
Me       | 31,32        ██
Me       | B1a,B1b         ██

Key:
  B1a = Backend slice 1a
  B1b = Backend slice 1b
Legend: ██ planned work, ▒▒ leave, ▓▓ weekend work
~~~

| Part | Rule |
|---|---|
| Left | `Resource \| Work (days)` — header fixed; cells hold short labels |
| Row 1 | Period numbers (`01 02 …`) |
| Row 2 | Weekdays (`Mo Tu We Th Fr Sa Su`) |
| Separator | `─` to the width of row 1 |
| Body | One row per item |
| Key | Required when any abbreviation appears — once under the table |
| Legend | **Always** under the table (after Key if present) |

Weekday of period 0: `--week-start 0..6` (Mon=0 … Sun=6, default `0`).
With a real `projectStart` date, use `weekStartFromDate(projectStart)`.

## Legend (required)

| Glyph | Meaning |
|---|---|
| `██` | Planned work (weekday) |
| `▒▒` | Leave / vacation |
| `▓▓` | Work on a weekend |

```text
Legend: ██ planned work, ▒▒ leave, ▓▓ weekend work
```

Weekend columns with **no** work/leave stay empty — the weekday row (`Sa`/`Su`) already marks them.

## Task model

Normalize every row to `{ resource?, label, start, duration, kind? }`:

| Field | Meaning |
|---|---|
| `resource` | Person/team. Empty string if unknown |
| `label` | Short task id / 1–2 words / abbreviation (see Labels) |
| `start` | Zero-based period index (inclusive) |
| `duration` | Number of periods (≥ 1) |
| `kind` | `work` (default) or `leave` |

Optional `glossary: { [abbr]: expansion }` — printed once as `Key:` under the chart. Legacy stdin field `name` is accepted as `label`.

When the user gives **dates**, convert with `tasksFromDates` / `periodsBetween` from `scripts/draw-gantt.ts`:

- `--unit day` → `unitDays = 1`
- `--unit week` → `unitDays = 7`
- `end` is exclusive; if the user gives inclusive end dates, add one unit before converting
- Period indexes already provided → use as-is

**Weekends:** default from `weekStart` via `weekendPeriodsFromWeekStart` (Sat/Sun). Override with `weekends[]` / `--weekends 5,6`. With real dates and `--unit day`, use `weekendPeriods(projectStart, totalPeriods, 1)`.

Cell priority per period: **leave → weekend-work (`▓▓`) → weekday-work (`██`) → empty**. Empty weekends stay blank.

Do not invent dependencies or reorder rows unless asked; preserve input order.

## How to draw

1. Build a `Task[]` with short `label`s; set `weekStart` / `weekends` / `glossary` for abbreviations.
2. Prefer the skill script — from this skill directory:
   ~~~bash
   npx --yes tsx scripts/draw-gantt.ts
   echo '{"tasks":[{"resource":"Me","label":"B1a","start":0,"duration":2}],"glossary":{"B1a":"Backend slice 1a"}}' \
     | npx --yes tsx scripts/draw-gantt.ts
   npx --yes tsx scripts/draw-gantt.ts --color
   ~~~
   Or call `drawGantt(tasks, { color, weekends, weekStart, glossary })` and paste the return value.
3. Wrap the **full chart including weekday row, Key (if any), and legend** in one ` ```text ` fence.

Color only when the user asked or passed `--color`. Default is monochrome glyphs.

## Output contract

Always emit:

1. One-line summary: period unit, range (indexes or dates), row count.
2. The chart (date row + weekday row + body + Key if needed + legend) in a ` ```text ` fence.
3. Optional notes only when useful: overlaps, zero-duration clamps, truncated labels (> 24 chars → shorten; put detail in Key).

Do **not** write files unless the user asks. Do **not** open FigJam/diagram tools — this skill is console/text only.

## Example

`npx --yes tsx scripts/draw-gantt.ts`:

~~~text
Resource | Work (days)  01 02 03 04 05 06 07 08 09
                        Mo Tu We Th Fr Sa Su Mo Tu
──────────────────────────────────────────────────
Me       | 31,32        ██                        
Me       | B1a,B1b         ██                     
Me       | B2a,B2b            ██                  
Me       | 36 start              ██               
Me       | 36,37,38                 ██            
Me       | Leave                       ▒▒ ▒▒      
Me       | follow-up                         ██ ██

Key:
  31 = Epic 31
  32 = Epic 32
  36 = Task 36
  37 = Task 37
  38 = Task 38
  B1a = Backend slice 1a
  B1b = Backend slice 1b
  B2a = Backend slice 2a
  B2b = Backend slice 2b

Legend: ██ planned work, ▒▒ leave, ▓▓ weekend work
~~~

## Common mistakes

| Mistake | Fix |
|---|---|
| Putting long titles under Work (days) | Keep header `Work (days)`; cells are ids / 1–2 words / abbrs (+ Key) |
| Long sentences in the grid | Shorten to id / 1–2 words; put detail in `Key:` |
| Abbreviation with no expansion | Always print `Key:` at least once for that abbr |
| Reimplementing the bar grid from scratch | Use `scripts/draw-gantt.ts` |
| Omitting the weekday row | Always print abbreviations under period numbers |
| Filling empty weekends with `▓▓` | Leave blank; `▓▓` only when there is work on that weekend |
| Omitting the legend | Always print the three-glyph legend under the table |
| Translating script UI | Keep English; only row labels may be non-English |
| Using cards/tables instead of a monospace chart | Always use a ` ```text ` fence |
| Mixing date strings into the bar grid | Convert dates → period offsets first |
| End-inclusive duration off-by-one | Half-open `[start, start+duration)` |
| Painting leave as `██` | Set `kind: "leave"` → `▒▒` |
| Coloring by default | Color only with `--color` |
| Reordering by start date silently | Keep input order; offer a sorted redraw only if asked |
