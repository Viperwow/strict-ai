/**
 * Canonical renderer for strict-gantt.
 * Half-open intervals: [start, start + duration).
 *
 * Layout:
 *   Resource | Work (days)  01 02 03 ...
 *                           Mo Tu We ...
 *   ─────────────────────────
 *   Me       | Task         ██
 *
 *   Legend: ██ planned work, ▒▒ leave, ▓▓ weekend work
 *   (empty weekends stay blank — weekday row marks Сб/Вс)
 *
 * Run demo: npx --yes tsx scripts/draw-gantt.ts
 * Flags: --color  --locale en|ru  --week-start 0  --weekends 5,6
 */

export type CellKind = "work" | "leave" | "weekend" | "empty";

export type TaskKind = "work" | "leave";

export type Task = {
  resource?: string;
  name: string;
  start: number; // zero-based period index, inclusive
  duration: number; // periods, >= 1
  kind?: TaskKind; // default: work
};

export type DateTask = {
  resource?: string;
  name: string;
  start: Date;
  end: Date; // exclusive
  kind?: TaskKind;
};

export type Locale = "en" | "ru";

const DAY_MS = 24 * 60 * 60 * 1000;

const GLYPH: Record<Exclude<CellKind, "empty">, string> = {
  work: "██",
  leave: "▒▒",
  weekend: "▓▓",
};

const LOCALE = {
  en: {
    resourceHeader: "Resource",
    workHeader: "Work (days)",
    weekdays: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const,
    legend: "Legend: ██ planned work, ▒▒ leave, ▓▓ weekend work",
  },
  ru: {
    resourceHeader: "Ресурс",
    workHeader: "Работа (дни)",
    weekdays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const,
    legend: "Легенда: ██ работа по плану, ▒▒ отпуск, ▓▓ работа в выходные",
  },
} as const;

/** ANSI fills for --color (work rotates; leave/weekend fixed). */
const WORK_PALETTE = [
  "\x1b[42m  \x1b[0m",
  "\x1b[44m  \x1b[0m",
  "\x1b[45m  \x1b[0m",
  "\x1b[46m  \x1b[0m",
];
const LEAVE_COLOR = "\x1b[43m  \x1b[0m";
const WEEKEND_COLOR = "\x1b[100m  \x1b[0m";

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
      resource: row.resource,
      name: row.name,
      start,
      duration: Math.max(1, end - start),
      kind: row.kind ?? "work",
    };
  });
}

/**
 * Period indexes that fall on Sat/Sun when each period is one day.
 * `weekStart`: weekday index of period 0 in Mon=0 … Sun=6.
 */
export function weekendPeriodsFromWeekStart(
  totalPeriods: number,
  weekStart = 0,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < totalPeriods; i++) {
    const wd = (weekStart + i) % 7;
    if (wd === 5 || wd === 6) out.push(i);
  }
  return out;
}

/**
 * Period indexes that fall on Sat/Sun from a calendar start date
 * when `unitDays === 1`.
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
    const wd = day.getDay(); // 0=Sun … 6=Sat
    if (wd === 0 || wd === 6) out.push(i);
  }
  return out;
}

/** Map JS getDay() (Sun=0) → Mon=0 … Sun=6. */
export function weekStartFromDate(projectStart: Date): number {
  return (projectStart.getDay() + 6) % 7;
}

function resolveCell(
  period: number,
  task: Task,
  weekends: ReadonlySet<number>,
): CellKind {
  const active = period >= task.start && period < task.start + task.duration;
  if (!active) return "empty";
  if (task.kind === "leave") return "leave";
  // Weekend columns stay blank unless there is work; then mark ▓▓.
  if (weekends.has(period)) return "weekend";
  return "work";
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

function weekdayLabel(
  index: number,
  weekStart: number,
  weekdays: readonly string[],
): string {
  return weekdays[(weekStart + index) % 7];
}

function leftLabel(
  resource: string,
  work: string,
  resourceWidth: number,
  workWidth: number,
): string {
  return `${resource.padEnd(resourceWidth)} | ${work.padEnd(workWidth)}  `;
}

export function drawGantt(
  tasks: Task[],
  options: {
    locale?: Locale;
    color?: boolean;
    weekends?: readonly number[];
    /** Weekday index of period 0: Mon=0 … Sun=6. Default 0 (Monday). */
    weekStart?: number;
    resourceHeader?: string;
    workHeader?: string;
  } = {},
): string {
  const locale = options.locale ?? "en";
  const L = LOCALE[locale];
  const color = options.color ?? false;
  const weekStart = options.weekStart ?? 0;
  const resourceHeader = options.resourceHeader ?? L.resourceHeader;
  const workHeader = options.workHeader ?? L.workHeader;

  if (tasks.length === 0) return "(no tasks)";

  const span = Math.max(
    ...tasks.map((task) => task.start + task.duration),
    0,
  );

  const autoWeekends = weekendPeriodsFromWeekStart(span, weekStart);
  const weekends = new Set(
    options.weekends !== undefined ? options.weekends : autoWeekends,
  );

  const weekendMax = weekends.size ? Math.max(...weekends) + 1 : 0;
  const periods = Math.max(span, weekendMax);

  const resourceWidth = Math.max(
    resourceHeader.length,
    ...tasks.map((t) => (t.resource ?? "").length),
    1,
  );
  const workWidth = Math.max(
    workHeader.length,
    ...tasks.map((t) => t.name.length),
    1,
  );

  const leftHeader = leftLabel(
    resourceHeader,
    workHeader,
    resourceWidth,
    workWidth,
  );
  const leftPad = " ".repeat(leftHeader.length);

  const dates =
    leftHeader +
    Array.from({ length: periods }, (_, index) =>
      periodLabel(index, periods),
    ).join(" ");

  const days =
    leftPad +
    Array.from({ length: periods }, (_, index) =>
      weekdayLabel(index, weekStart, L.weekdays),
    ).join(" ");

  const lines = [dates, days, "─".repeat(dates.length)];

  tasks.forEach((task, taskIndex) => {
    const left = leftLabel(
      task.resource ?? "",
      task.name,
      resourceWidth,
      workWidth,
    );
    const timeline = Array.from({ length: periods }, (_, period) => {
      const kind = resolveCell(period, task, weekends);
      return renderCell(kind, taskIndex, color);
    }).join(" ");

    lines.push(left + timeline);
  });

  lines.push("");
  lines.push(L.legend);

  return lines.join("\n");
}

function demoTasks(locale: Locale): Task[] {
  const me = locale === "ru" ? "Я" : "Me";
  if (locale === "ru") {
    return [
      { resource: me, name: "31,32 эпики", start: 0, duration: 1 },
      { resource: me, name: "B1a,B1b своя (эпик)", start: 1, duration: 1 },
      { resource: me, name: "B2a,B2b своя (эпик)", start: 2, duration: 1 },
      { resource: me, name: "36 старт", start: 3, duration: 1 },
      { resource: me, name: "36,37,38", start: 4, duration: 1 },
      { resource: me, name: "Отпуск", start: 5, duration: 2, kind: "leave" },
      { resource: me, name: "продолжение", start: 7, duration: 2 },
    ];
  }
  return [
    { resource: me, name: "31,32 epics", start: 0, duration: 1 },
    { resource: me, name: "B1a,B1b own (epic)", start: 1, duration: 1 },
    { resource: me, name: "B2a,B2b own (epic)", start: 2, duration: 1 },
    { resource: me, name: "36 start", start: 3, duration: 1 },
    { resource: me, name: "36,37,38", start: 4, duration: 1 },
    { resource: me, name: "Leave", start: 5, duration: 2, kind: "leave" },
    { resource: me, name: "follow-up", start: 7, duration: 2 },
  ];
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}

function parseWeekends(args: string[]): number[] | undefined {
  const idx = args.indexOf("--weekends");
  if (idx < 0 || !args[idx + 1]) return undefined;
  return args[idx + 1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 0);
}

function parseLocale(args: string[]): Locale | undefined {
  const idx = args.indexOf("--locale");
  if (idx < 0 || !args[idx + 1]) return undefined;
  const v = args[idx + 1];
  if (v === "en" || v === "ru") return v;
  throw new Error("--locale must be en or ru");
}

function parseWeekStart(args: string[]): number | undefined {
  const idx = args.indexOf("--week-start");
  if (idx < 0 || !args[idx + 1]) return undefined;
  const n = Number(args[idx + 1]);
  if (!Number.isInteger(n) || n < 0 || n > 6) {
    throw new Error("--week-start must be 0..6 (Mon=0 … Sun=6)");
  }
  return n;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const color = args.includes("--color");
  const locale = parseLocale(args) ?? "en";
  const weekStart = parseWeekStart(args);
  const weekends = parseWeekends(args);

  let tasks = demoTasks(locale);
  let weekendOverride = weekends;
  let weekStartOpt = weekStart;

  if (!process.stdin.isTTY) {
    const raw = await readStdin();
    if (raw) {
      const parsed = JSON.parse(raw) as
        | Task[]
        | {
            tasks: Task[];
            weekends?: number[];
            weekStart?: number;
          };
      if (Array.isArray(parsed)) {
        tasks = parsed;
      } else if (parsed && Array.isArray(parsed.tasks)) {
        tasks = parsed.tasks;
        if (weekendOverride === undefined && parsed.weekends) {
          weekendOverride = parsed.weekends;
        }
        if (weekStartOpt === undefined && parsed.weekStart !== undefined) {
          weekStartOpt = parsed.weekStart;
        }
      } else {
        throw new Error(
          "stdin JSON must be Task[] or { tasks, weekends?, weekStart? }",
        );
      }
    }
  }

  console.log(
    drawGantt(tasks, {
      locale,
      color,
      weekends: weekendOverride,
      weekStart: weekStartOpt,
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
