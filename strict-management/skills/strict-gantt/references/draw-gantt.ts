/**
 * Reference implementation for strict-gantt.
 * Half-open intervals: [start, start + duration).
 *
 * Run demo: npx --yes tsx references/draw-gantt.ts
 * Run with JSON stdin: echo '[...]' | npx --yes tsx references/draw-gantt.ts
 * Flags: --color  --header <label>
 */

export type Task = {
  name: string;
  start: number; // zero-based period index, inclusive
  duration: number; // periods, >= 1
};

export type DateTask = {
  name: string;
  start: Date;
  end: Date; // exclusive
};

const DAY_MS = 24 * 60 * 60 * 1000;

const PALETTE = [
  "\x1b[42m  \x1b[0m", // green
  "\x1b[44m  \x1b[0m", // blue
  "\x1b[45m  \x1b[0m", // magenta
  "\x1b[46m  \x1b[0m", // cyan
];

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
    };
  });
}

function cell(isActive: boolean, taskIndex: number, color: boolean): string {
  if (!isActive) return "  ";
  if (!color) return "██";
  return PALETTE[taskIndex % PALETTE.length];
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
  options: { nameHeader?: string; color?: boolean } = {},
): string {
  const nameHeader = options.nameHeader ?? "Task";
  const color = options.color ?? false;

  if (tasks.length === 0) return "(no tasks)";

  const totalPeriods = Math.max(
    ...tasks.map((task) => task.start + task.duration),
  );

  const nameWidth =
    Math.max(...tasks.map((task) => task.name.length), nameHeader.length) + 2;

  const header =
    nameHeader.padEnd(nameWidth) +
    Array.from({ length: totalPeriods }, (_, index) =>
      periodLabel(index, totalPeriods),
    ).join(" ");

  const lines = [header, "─".repeat(header.length)];

  tasks.forEach((task, taskIndex) => {
    const timeline = Array.from({ length: totalPeriods }, (_, period) => {
      const isActive =
        period >= task.start && period < task.start + task.duration;
      return cell(isActive, taskIndex, color);
    }).join(" ");

    lines.push(task.name.padEnd(nameWidth) + timeline);
  });

  return lines.join("\n");
}

const DEMO_TASKS: Task[] = [
  { name: "Analysis", start: 0, duration: 3 },
  { name: "Design", start: 2, duration: 3 },
  { name: "Development", start: 4, duration: 4 },
  { name: "Testing", start: 8, duration: 2 },
];

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const color = args.includes("--color");
  const headerIdx = args.indexOf("--header");
  const nameHeader =
    headerIdx >= 0 && args[headerIdx + 1] ? args[headerIdx + 1] : "Task";

  let tasks = DEMO_TASKS;

  if (!process.stdin.isTTY) {
    const raw = await readStdin();
    if (raw) {
      const parsed = JSON.parse(raw) as Task[];
      if (!Array.isArray(parsed)) {
        throw new Error("stdin JSON must be an array of Task objects");
      }
      tasks = parsed;
    }
  }

  console.log(drawGantt(tasks, { nameHeader, color }));
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
