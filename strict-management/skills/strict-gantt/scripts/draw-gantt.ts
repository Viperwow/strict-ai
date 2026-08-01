/**
 * Canonical renderer for strict-gantt.
 * Half-open intervals: [start, start + duration).
 *
 * Cell legend:
 *   ██ planned work
 *   ▒▒ leave
 *   ▓▓ weekend
 *
 * Run demo: npx --yes tsx scripts/draw-gantt.ts
 * Run with JSON stdin: echo '[...]' | npx --yes tsx scripts/draw-gantt.ts
 * Flags: --color  --header <label>  --weekends 5,6  --legend en|ru
 */

export type CellKind = "work" | "leave" | "weekend" | "empty";

export type TaskKind = "work" | "leave";

export type Task = {
  name: string;
  start: number; // zero-based period index, inclusive
  duration: number; // periods, >= 1
  kind?: TaskKind; // default: work
};

export type DateTask = {
  name: string;
  start: Date;
  end: Date; // exclusive
  kind?: TaskKind;
};

export type LegendLocale = "en" | "ru";

const DAY_MS = 24 * 60 * 60 * 1000;

const GLYPH: Record<Exclude<CellKind, "empty">, string> = {
  work: "██",
  leave: "▒▒",
  weekend: "▓▓",
};

const LEGEND: Record<LegendLocale, string> = {
  en: "Legend: ██ planned work, ▒▒ leave, ▓▓ weekend",
  ru: "Легенда: ██ работа по плану, ▒▒ отпуск, ▓▓ выходные",
};

/** ANSI fills for --color (work rotates; leave/weekend fixed). */
const WORK_PALETTE = [
  "\x1b[42m  \x1b[0m", // green
  "\x1b[44m  \x1b[0m", // blue
  "\x1b[45m  \x1b[0m", // magenta
  "\x1b[46m  \x1b[0m", // cyan
];
const LEAVE_COLOR = "\x1b[43m  \x1b[0m"; // yellow
const WEEKEND_COLOR = "\x1b[100m  \x1b[0m"; // bright black

export function periodsBetween(
  projectStart: Date,
  date: Date,
  unitDays: number,
): number {
  return Math.floor(
    (date.getTime() - projectStart.getTime()) / (DAY_MS * unitDays),
  );
}

/** Convert date-ranged tasks to period tasks. `end` is exclusive. */
export function tasksFromDates(
  rows: DateTask[],
  unitDays: number,
): Task[] {
  if (rows.length === 0) return [];

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
      kind: row.kind ?? "work",
    };
  });
}

/**
 * Period indexes that fall on Sat/Sun when each period is one day
 * (`unitDays === 1`). No-op for week-sized periods.
 */
export function weekendPeriods(
  projectStart: Date,
  totalPeriods: number,
  unitDays: number,
): number[] {
  if (unitDays !== 1 || totalPeriods <= 0) return [];

  const out: number[] = [];
  for (let i = 0; i < totalPeriods; i++) {
    const day = new Date(projectStart.getTime() + i * DAY_MS);
    const wd = day.getDay();
    if (wd === 0 || wd === 6) out.push(i);
  }
  return out;
}

function resolveCell(
  period: number,
  task: Task,
  weekends: ReadonlySet<number>,
): CellKind {
  if (weekends.has(period)) return "weekend";

  const active = period >= task.start && period < task.start + task.duration;
  if (!active) return "empty";
  return task.kind === "leave" ? "leave" : "work";
}

function renderCell(
  kind: CellKind,
  taskIndex: number,
  color: boolean,
): string {
  if (kind === "empty") return "  ";
  if (!color) return GLYPH[kind];
  if (kind === "leave") return LEAVE_COLOR;
  if (kind === "weekend") return WEEKEND_COLOR;
  return WORK_PALETTE[taskIndex % WORK_PALETTE.length];
}

function periodLabel(index: number, totalPeriods: number): string {
  const n = index + 1;
  if (totalPeriods > 60) {
    return n % 5 === 0 ? String(n).padStart(2, "0") : "  ";
  }
  if (totalPeriods > 31) {
    return n % 2 === 0 ? String(n).padStart(2, "0") : "  ";
  }
  return String(n).padStart(2, "0");
}

export function drawGantt(
  tasks: Task[],
  options: {
    nameHeader?: string;
    color?: boolean;
    weekends?: readonly number[];
    legend?: LegendLocale | false;
  } = {},
): string {
  const nameHeader = options.nameHeader ?? "Task";
  const color = options.color ?? false;
  const weekends = new Set(options.weekends ?? []);
  const legend =
    options.legend === false
      ? null
      : (options.legend ?? (nameHeader === "Задача" ? "ru" : "en"));

  if (tasks.length === 0) return "(no tasks)";

  const span = Math.max(
    ...tasks.map((task) => task.start + task.duration),
    0,
  );
  const weekendMax = weekends.size ? Math.max(...weekends) + 1 : 0;
  const periods = Math.max(span, weekendMax);

  const nameWidth =
    Math.max(...tasks.map((task) => task.name.length), nameHeader.length) + 2;

  const header =
    nameHeader.padEnd(nameWidth) +
    Array.from({ length: periods }, (_, index) =>
      periodLabel(index, periods),
    ).join(" ");

  const lines = [header, "─".repeat(header.length)];

  tasks.forEach((task, taskIndex) => {
    const timeline = Array.from({ length: periods }, (_, period) => {
      const kind = resolveCell(period, task, weekends);
      return renderCell(kind, taskIndex, color);
    }).join(" ");

    lines.push(task.name.padEnd(nameWidth) + timeline);
  });

  if (legend) {
    lines.push("");
    lines.push(LEGEND[legend]);
  }

  return lines.join("\n");
}

const DEMO_TASKS: Task[] = [
  { name: "Analysis", start: 0, duration: 3 },
  { name: "Design", start: 2, duration: 3 },
  { name: "Leave", start: 4, duration: 2, kind: "leave" },
  { name: "Development", start: 5, duration: 4 },
  { name: "Testing", start: 9, duration: 2 },
];

/** Demo weekends: periods 6 and 7 (columns 07–08). */
const DEMO_WEEKENDS = [6, 7];

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}

function parseWeekends(args: string[]): number[] {
  const idx = args.indexOf("--weekends");
  if (idx < 0 || !args[idx + 1]) return [];
  return args[idx + 1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 0);
}

function parseLegend(args: string[]): LegendLocale | undefined {
  const idx = args.indexOf("--legend");
  if (idx < 0 || !args[idx + 1]) return undefined;
  const v = args[idx + 1];
  if (v === "en" || v === "ru") return v;
  throw new Error("--legend must be en or ru");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const color = args.includes("--color");
  const headerIdx = args.indexOf("--header");
  const nameHeader =
    headerIdx >= 0 && args[headerIdx + 1] ? args[headerIdx + 1] : "Task";
  const weekends = parseWeekends(args);
  const legend = parseLegend(args);

  let tasks = DEMO_TASKS;
  let weekendList = weekends.length ? weekends : DEMO_WEEKENDS;

  if (!process.stdin.isTTY) {
    const raw = await readStdin();
    if (raw) {
      const parsed = JSON.parse(raw) as
        | Task[]
        | { tasks: Task[]; weekends?: number[] };
      if (Array.isArray(parsed)) {
        tasks = parsed;
      } else if (parsed && Array.isArray(parsed.tasks)) {
        tasks = parsed.tasks;
        if (!weekends.length && parsed.weekends) {
          weekendList = parsed.weekends;
        }
      } else {
        throw new Error(
          "stdin JSON must be Task[] or { tasks: Task[], weekends?: number[] }",
        );
      }
      if (!weekends.length && Array.isArray(parsed)) {
        weekendList = [];
      }
    }
  }

  console.log(
    drawGantt(tasks, {
      nameHeader,
      color,
      weekends: weekendList,
      legend,
    }),
  );
}

const isDirectRun =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("draw-gantt.ts") ||
    process.argv[1].endsWith("draw-gantt.js"));

if (isDirectRun) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
