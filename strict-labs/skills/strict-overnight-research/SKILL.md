---
name: strict-overnight-research
description: Queue research questions by day and process them overnight via Cursor Automations. Use when adding overnight research topics, running the night batch, reviewing morning digests, or setting up the scheduled automation. Triggers on /strict-overnight-research, /queue-research, or phrases like "overnight research", "queue for tonight", "process research queue".
---

# strict-overnight-research

Daytime enqueue + overnight batch for research questions. Companion to the Cursor Automation "Overnight research tasks".

## Invocation

~~~text
/strict-overnight-research                    # status: pending count + last digest
/strict-overnight-research --queue "<topic>"  # add one pending item
/strict-overnight-research --queue            # interactive: ask for topic + optional notes
/strict-overnight-research --run              # process the overnight batch (automation mode)
/strict-overnight-research --digest           # show latest morning digest summary
~~~

Aliases: `/queue-research` → `--queue`.

## Data layout

| Path | Role |
|:---|:---|
| `docs/research/queue.md` | Pending + done checklist |
| `docs/research/results/` | One markdown report per completed topic |
| `references/queue-format.md` | Queue schema |
| `references/report-format.md` | Report schema |
| `references/automation-prompt.md` | Paste into Cursor Automations UI |

## Modes

### Status (default)

1. Read `docs/research/queue.md`.
2. Print: pending count, next 1–3 topics, path of newest file in `docs/research/results/` (if any).
3. If pending = 0, suggest `--queue`.

### Queue

1. Append a pending item to `docs/research/queue.md` per `references/queue-format.md`.
2. Confirm with the new id and one-line title.
3. Do not research in this mode — enqueue only.

### Run (overnight / automation)

Follow `references/automation-prompt.md` pipeline. Cap: **1–3** pending items per run (oldest first). Skip items marked `blocked`.

For each selected item:

1. Research with web + repo evidence (cite URLs and `path:line`).
2. Write `docs/research/results/YYYY-MM-DD-<slug>.md` per `references/report-format.md`.
3. Mark the queue item done and link the report path.
4. Update automation memory with: topic id, date, one-line finding, report path (avoid re-researching the same question).

After the batch:

- Open a PR if any report files were written.
- Print a short morning digest (titles + one-line verdict each).
- If the queue was empty: do nothing, write a one-line note to memory, do not open a PR.

### Digest

Summarize the newest report(s) from today (or the latest run date). Keep it to title + verdict + path.

## Rules

1. Enqueue ≠ research. Day mode never starts research.
2. Night mode never invents topics — only drains the queue.
3. Prefer primary sources (official docs, RFCs, repo files) over blog recaps.
4. 80/20: answer the question; skip encyclopedia padding.
5. If a topic needs credentials or private systems you lack → mark `blocked` with reason; continue the batch.
