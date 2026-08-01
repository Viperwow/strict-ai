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

Default header is **`Work (days)`**. Prefix **`Resource |`** only with **2+ distinct subjects** (me + colleague, etc.); one subject → no Resource column. Cells stay short:

| Form | Example | Key needed? |
|---|---|---|
| Task id | `Task 31` · `31,32` · `PROJ-12` | No — ids are self-explanatory |
| 1–2 words | `36 Start` · `Follow-up` | No |
| Abbreviation / acronym | `ADR` · `RFC` | **Yes** — expand at least once in `Key:` |

**Capitalize** every label: first letter of the label and of each space/comma-separated word (`follow-up` → `Follow-up`, `ADR draft` → `ADR Draft`). The script does this in `normalizeTask` / `capitalizeLabel`.

Abbreviations are short letter-codes whose expansion is usually several long words (often **more than two** parts), e.g. `ADR = Architectural Design Requirements`. Do **not** put task numbers like `31` / `Task 31` into `Key:`.

Never put the full multi-word expansion into the grid cell — keep the abbr in the cell, expansion under the chart. Always capitalize labels.


## Chart layout (required)

Single subject (Resource hidden):

~~~text
Work (days)  01 02 03 04 05 06 07 08 09 10
             Mo Tu We Th Fr Sa Su Mo Tu We
──────────────────────────────────────────
Task 31      ██
ADR Draft          ██

Legend: ██ planned work, ▒▒ leave, ▓▓ weekend work

Key:
  ADR = Architectural Design Requirements
~~~

Multiple subjects:

~~~text
Resource | Work (days)  01 02 03 …
                        Mo Tu We …
Me       | Task 31      ██
Ann      | Task 32         ██
~~~

| Part | Rule |
|---|---|
| Resource | Show **only** if `distinctResources(tasks).length > 1` |
| Work (days) | Always shown |
| Row 1 | Period numbers (`01 02 …`) |
| Row 2 | Weekdays (`Mo Tu We Th Fr Sa Su`) |
| Separator | `─` to the width of row 1 |
| Body | One row per item |
| Legend | **Always** under the table |
| Key | Abbreviations/acronyms only — after Legend |

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

Print **Legend** first, then **Key** (when needed).

## Task model

Normalize every row to `{ resource?, label, start, duration, kind? }`:

| Field | Meaning |
|---|---|
| `resource` | Person/team. Empty string if unknown |
| `label` | Short task id / 1–2 words / abbreviation; always Capitalized |
| `start` | Zero-based period index (inclusive) |
| `duration` | Number of periods (≥ 1) |
| `kind` | `work` (default) or `leave` |

Optional `glossary: { [abbr]: expansion }` — only for abbreviations/acronyms (e.g. ADR), printed as `Key:` **after** Legend. Skip task ids. Legacy stdin field `name` is accepted as `label`.

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
   echo '{"tasks":[{"resource":"Me","label":"ADR Draft","start":0,"duration":2}],"glossary":{"ADR":"Architectural Design Requirements"}}' \
     | npx --yes tsx scripts/draw-gantt.ts
   npx --yes tsx scripts/draw-gantt.ts --color
   ~~~
   Or call `drawGantt(tasks, { color, weekends, weekStart, glossary })` and paste the return value.
3. Wrap the **full chart including weekday row, legend, and Key (if any)** in one ` ```text ` fence.

Color only when the user asked or passed `--color`. Default is monochrome glyphs.

## Output contract

Always emit:

1. One-line summary: period unit, range (indexes or dates), row count.
2. The chart (date row + weekday row + body + legend + Key if needed) in a ` ```text ` fence.
3. Optional notes only when useful: overlaps, zero-duration clamps, truncated labels (> 24 chars → shorten; put detail in Key).

Do **not** write files unless the user asks. Do **not** open FigJam/diagram tools — this skill is console/text only.

## Example

`npx --yes tsx scripts/draw-gantt.ts` (single subject — no Resource column):

~~~text
Work (days)  01 02 03 04 05 06 07 08 09
             Mo Tu We Th Fr Sa Su Mo Tu
───────────────────────────────────────
Task 31      ██                        
Task 32         ██                     
ADR Draft          ██                  
36 Start              ██               
36,37,38                 ██            
Leave                       ▒▒ ▒▒      
Follow-up                         ██ ██

Legend: ██ planned work, ▒▒ leave, ▓▓ weekend work

Key:
  ADR = Architectural Design Requirements
~~~

## Common mistakes

| Mistake | Fix |
|---|---|
| Putting full expansions in the grid | Keep abbr in the cell; put multi-word expansion in `Key:` |
| Lowercase labels (`follow-up`) | Capitalize: `Follow-up` |
| Showing Resource with one subject | Omit Resource unless 2+ distinct people/teams |
| Long sentences in the grid | Shorten to id / 1–2 words; put detail in `Key:` |
| Abbreviation/acronym with no expansion | Always print `Key:` once (e.g. `ADR = Architectural Design Requirements`) |
| Putting `Task 31` / bare ids into `Key:` | Key is only for abbrs/acronyms, not task numbers |
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
