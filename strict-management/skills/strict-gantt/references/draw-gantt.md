# draw-gantt — reference implementation

Copy or adapt this TypeScript when emitting a console Gantt. Keep the half-open interval `[start, start + duration)`.

## Types

```ts
type Task = {
  name: string;
  start: number; // zero-based period index, inclusive
  duration: number; // periods, >= 1
};
```

## Monochrome render

```ts
function drawGantt(tasks: Task[], nameHeader = "Task"): string {
  if (tasks.length === 0) return "(no tasks)";

  const totalPeriods = Math.max(
    ...tasks.map((task) => task.start + task.duration),
  );

  const nameWidth =
    Math.max(...tasks.map((task) => task.name.length), nameHeader.length) + 2;

  const header =
    nameHeader.padEnd(nameWidth) +
    Array.from({ length: totalPeriods }, (_, index) =>
      String(index + 1).padStart(2, "0"),
    ).join(" ");

  const lines = [header, "─".repeat(header.length)];

  for (const task of tasks) {
    const timeline = Array.from({ length: totalPeriods }, (_, period) => {
      const isActive =
        period >= task.start && period < task.start + task.duration;
      return isActive ? "██" : "  ";
    }).join(" ");

    lines.push(task.name.padEnd(nameWidth) + timeline);
  }

  return lines.join("\n");
}
```

## ANSI color cells

```ts
const palette = [
  "\x1b[42m  \x1b[0m", // green
  "\x1b[44m  \x1b[0m", // blue
  "\x1b[45m  \x1b[0m", // magenta
  "\x1b[46m  \x1b[0m", // cyan
];

function cell(isActive: boolean, taskIndex: number, color: boolean): string {
  if (!isActive) return "  ";
  if (!color) return "██";
  return palette[taskIndex % palette.length];
}
```

Use `cell(...)` inside the period loop when `--color` is on. Prefer monochrome `██` in markdown chat unless the runtime is a real terminal.

## Date → period offset

```ts
const dayMs = 24 * 60 * 60 * 1000;

function periodsBetween(
  projectStart: Date,
  date: Date,
  unitDays: number,
): number {
  return Math.floor(
    (date.getTime() - projectStart.getTime()) / (dayMs * unitDays),
  );
}

function tasksFromDates(
  rows: { name: string; start: Date; end: Date }[],
  unitDays: number,
): Task[] {
  const projectStart = new Date(
    Math.min(...rows.map((row) => row.start.getTime())),
  );

  return rows.map((row) => {
    const start = periodsBetween(projectStart, row.start, unitDays);
    const end = periodsBetween(projectStart, row.end, unitDays);
    return {
      name: row.name,
      start,
      duration: Math.max(1, end - start),
    };
  });
}
```

`end` is exclusive. If the user gives inclusive end dates, add one unit before converting.

## Wide timelines

When `totalPeriods > 31`, still allocate one cell per period, but print header labels only for periods where `(index + 1) % 2 === 0` (or `% 5 === 0` if `> 60`), leaving other header slots as `"  "` so columns stay aligned.
