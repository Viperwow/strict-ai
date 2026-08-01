/**
 * Canonical renderer for strict-gantt.
 * Half-open intervals: [start, start + duration).
 * UI strings are English only — no translations in this script.
 *
 * Layout (multi-resource — 2+ distinct subjects):
 *   Resource | Work (days)  01 02 03 ...
 *                           Mo Tu We ...
 *   Me       | Task 31      ██
 *
 * Layout (single resource — Resource column omitted):
 *   Work (days)  01 02 03 ...
 *                Mo Tu We ...
 *   Task 31      ██
 *
 *   Key: ADR = …   (abbreviations only)
 *   Legend: ██ planned work, ▒▒ leave, ▓▓ weekend work
 *
 * One track = one person (resource): each body row belongs to exactly one
 * person; a person may have many task rows (grouped together). Never put
 * two people on one row. Show Resource column when 2+ distinct subjects.
 * Run demo: npx --yes tsx scripts/draw-gantt.ts
 * Flags: --color  --week-start 0  --weekends 5,6
 */

export type CellKind = "work" | "leave" | "weekend" | "empty";

export type TaskKind = "work" | "leave";

export type Task = {
  resource?: string;
  /** Short label: task id/ref, 1–2 words, or abbreviation. */
  label: string;
  start: number; // zero-based period index, inclusive
  duration: number; // periods, >= 1
  kind?: TaskKind; // default: work
};

export type DateTask = {
  resource?: string;
  label: string;
  start: Date;
  end: Date; // exclusive
  kind?: TaskKind;
};

/** Abbreviation → expansion. Printed once under the chart when non-empty. */
export type Glossary = Record<string, string>;

const DAY_MS = 24 * 60 * 60 * 1000;

const RESOURCE_HEADER = "Resource";
const WORK_HEADER = "Work (days)";
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const LEGEND = "Legend: ██ planned work, ▒▒ leave, ▓▓ weekend work";

const GLYPH: Record<Exclude<CellKind, "empty">, string> = {
  work: "██",
  leave: "▒▒",
  weekend: "▓▓",
};

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
      label: row.label,
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
  if (weekends.has(period)) return "weekend";
  return "work";
}

/**
 * Keep each person's task rows contiguous (first-seen resource order).
 * Does not merge tasks — one body row per task.
 */
export function orderTasksByResource(tasks: readonly Task[]): Task[] {
  const order: string[] = [];
  const groups = new Map<string, Task[]>();

  for (const task of tasks) {
    const key = (task.resource ?? "").trim();
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(task);
  }

  return order.flatMap((key) => groups.get(key)!);
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

function weekdayLabel(index: number, weekStart: number): string {
  return WEEKDAYS[(weekStart + index) % 7];
}

function leftLabel(
  label: string,
  labelWidth: number,
  resource?: { value: string; width: number },
): string {
  const task = label.padEnd(labelWidth);
  if (!resource) return `${task}  `;
  return `${resource.value.padEnd(resource.width)} | ${task}  `;
}

/** Distinct non-empty resources; empty/missing counts as one anonymous subject. */
export function distinctResources(tasks: readonly Task[]): string[] {
  const set = new Set(
    tasks.map((t) => (t.resource ?? "").trim()).filter(Boolean),
  );
  return [...set];
}

function formatGlossary(glossary: Glossary): string[] {
  const entries = Object.entries(glossary).filter(
    ([abbr, meaning]) => abbr.trim() && meaning.trim(),
  );
  if (entries.length === 0) return [];
  return [
    "Key:",
    ...entries.map(([abbr, meaning]) => `  ${abbr} = ${meaning}`),
  ];
}

/** Capitalize the first letter of the label and of each space/comma-separated word. */
export function capitalizeLabel(label: string): string {
  return label.replace(/(^|[\s,/])(\p{L})/gu, (_m, sep: string, ch: string) => {
    return sep + ch.toUpperCase();
  });
}

/** Accept `label` or legacy `name`. Always capitalizes the label. */
function normalizeTask(
  raw: Task | (Omit<Task, "label"> & { name?: string; label?: string }),
): Task {
  const label = raw.label ?? (raw as { name?: string }).name;
  if (!label) {
    throw new Error("each task needs a short label (or legacy name)");
  }
  return {
    resource: raw.resource,
    label: capitalizeLabel(label.trim()),
    start: raw.start,
    duration: raw.duration,
    kind: raw.kind,
  };
}

export function drawGantt(
  tasks: Task[],
  options: {
    color?: boolean;
    weekends?: readonly number[];
    /** Weekday index of period 0: Mon=0 … Sun=6. Default 0 (Monday). */
    weekStart?: number;
    resourceHeader?: string;
    workHeader?: string;
    /** Expansions for abbreviations used in labels — printed once under the chart. */
    glossary?: Glossary;
  } = {},
): string {
  const color = options.color ?? false;
  const weekStart = options.weekStart ?? 0;
  const resourceHeader = options.resourceHeader ?? RESOURCE_HEADER;
  const workHeader = options.workHeader ?? WORK_HEADER;
  const normalized = tasks.map((t) => normalizeTask(t));

  if (normalized.length === 0) return "(no tasks)";

  // One track = one person: group rows by resource; still one row per task.
  const ordered = orderTasksByResource(normalized);

  const span = Math.max(
    ...ordered.map((task) => task.start + task.duration),
    0,
  );

  const autoWeekends = weekendPeriodsFromWeekStart(span, weekStart);
  const weekends = new Set(
    options.weekends !== undefined ? options.weekends : autoWeekends,
  );

  const weekendMax = weekends.size ? Math.max(...weekends) + 1 : 0;
  const periods = Math.max(span, weekendMax);

  const resources = distinctResources(ordered);
  const showResource = resources.length > 1;

  const resourceWidth = showResource
    ? Math.max(
        resourceHeader.length,
        ...ordered.map((t) => (t.resource ?? "").length),
        1,
      )
    : 0;
  const labelWidth = Math.max(
    workHeader.length,
    ...ordered.map((t) => t.label.length),
    1,
  );

  const leftHeader = leftLabel(
    workHeader,
    labelWidth,
    showResource ? { value: resourceHeader, width: resourceWidth } : undefined,
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
      weekdayLabel(index, weekStart),
    ).join(" ");

  const lines = [dates, days, "─".repeat(dates.length)];

  ordered.forEach((task, taskIndex) => {
    const left = leftLabel(
      task.label,
      labelWidth,
      showResource
        ? { value: task.resource ?? "", width: resourceWidth }
        : undefined,
    );
    const timeline = Array.from({ length: periods }, (_, period) => {
      const kind = resolveCell(period, task, weekends);
      return renderCell(kind, taskIndex, color);
    }).join(" ");

    lines.push(left + timeline);
  });

  lines.push("");
  lines.push(LEGEND);

  const keyLines = formatGlossary(options.glossary ?? {});
  if (keyLines.length) {
    lines.push("");
    lines.push(...keyLines);
  }

  return lines.join("\n");
}

const DEMO_TASKS: Task[] = [
  { resource: "S1", label: "E2-A US", start: 0, duration: 1 },
  { resource: "S1", label: "E1-A US", start: 1, duration: 1 },
  { resource: "S1", label: "Stabilize", start: 2, duration: 1 },
  { resource: "S1", label: "E2-B US", start: 3, duration: 1 },
  { resource: "S1", label: "E1-B US", start: 4, duration: 1 },
  { resource: "S1", label: "Stabilize", start: 7, duration: 1 },
  { resource: "S1", label: "E3-A US", start: 8, duration: 1 },
  { resource: "S1", label: "E2-C US", start: 9, duration: 1 },
  { resource: "S1", label: "Stabilize", start: 10, duration: 1 },
  { resource: "S2", label: "E2-D US", start: 0, duration: 1 },
  { resource: "S2", label: "E1-C US", start: 1, duration: 1 },
  { resource: "S2", label: "Stabilize", start: 2, duration: 1 },
  { resource: "S2", label: "E2-E US", start: 3, duration: 1 },
  { resource: "S2", label: "E1-D US", start: 4, duration: 1 },
  { resource: "S2", label: "Stabilize", start: 7, duration: 1 },
  { resource: "S2", label: "E3-B US", start: 8, duration: 1 },
  { resource: "S2", label: "E2-F US", start: 9, duration: 1 },
  { resource: "S2", label: "Stabilize", start: 10, duration: 1 },
  { resource: "M", label: "DB Fix W1", start: 0, duration: 1 },
  { resource: "M", label: "CB Fix W1", start: 1, duration: 1 },
  { resource: "M", label: "TD-1", start: 2, duration: 1 },
  { resource: "M", label: "DB Fix W1", start: 3, duration: 1 },
  { resource: "M", label: "CB Fix W1", start: 4, duration: 1 },
  { resource: "M", label: "TD-2", start: 7, duration: 1 },
  { resource: "M", label: "DB Fix W2", start: 8, duration: 1 },
  { resource: "M", label: "CB Fix W2", start: 9, duration: 1 },
  { resource: "J1", label: "CB Fix W1", start: 0, duration: 5 },
  { resource: "J1", label: "CB Fix W2", start: 7, duration: 4 },
  { resource: "J2", label: "DB Fix W1", start: 0, duration: 5 },
  { resource: "J2", label: "DB Fix W2", start: 7, duration: 4 },
];

/** Abbreviations/acronyms only — not bare task numbers. */
const DEMO_GLOSSARY: Glossary = {
  US: "User Story",
  DB: "Developer-Introduced Bug",
  CB: "Client-Reported Bug",
  TD: "Technical Debt Task, Epic 4",
  E1: "Epic priority Highest",
  E2: "Epic priority Medium",
  E3: "Epic priority Medium",
  S1: "Senior Developer 1",
  S2: "Senior Developer 2",
  M: "Middle Developer",
  J1: "Junior Developer 1",
  J2: "Junior Developer 2",
};

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
  const weekStart = parseWeekStart(args);
  const weekends = parseWeekends(args);

  let tasks: Task[] = DEMO_TASKS;
  let glossary: Glossary | undefined = DEMO_GLOSSARY;
  let weekendOverride = weekends;
  let weekStartOpt = weekStart;

  if (!process.stdin.isTTY) {
    const raw = await readStdin();
    if (raw) {
      const parsed = JSON.parse(raw) as
        | Task[]
        | {
            tasks: Array<Task | { name?: string; label?: string }>;
            weekends?: number[];
            weekStart?: number;
            glossary?: Glossary;
          };
      if (Array.isArray(parsed)) {
        tasks = parsed.map((t) => normalizeTask(t as Task));
        glossary = undefined;
      } else if (parsed && Array.isArray(parsed.tasks)) {
        tasks = parsed.tasks.map((t) => normalizeTask(t as Task));
        glossary = parsed.glossary;
        if (weekendOverride === undefined && parsed.weekends) {
          weekendOverride = parsed.weekends;
        }
        if (weekStartOpt === undefined && parsed.weekStart !== undefined) {
          weekStartOpt = parsed.weekStart;
        }
      } else {
        throw new Error(
          "stdin JSON must be Task[] or { tasks, weekends?, weekStart?, glossary? }",
        );
      }
    }
  }

  console.log(
    drawGantt(tasks, {
      color,
      weekends: weekendOverride,
      weekStart: weekStartOpt,
      glossary,
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
