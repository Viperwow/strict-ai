---
name: strict-overnight-research
description: Queue research questions and tool/experiment checks by day; process them overnight via Cursor Automations. Use when adding overnight research or experiment topics, verifying a tool overnight, running the night batch, reviewing morning digests, or setting up the scheduled automation. Triggers on /strict-overnight-research, /queue-research, /queue-experiment, or phrases like "overnight research", "overnight experiment", "queue for tonight", "test this tool overnight", "process research queue".
---

# strict-overnight-research

Daytime enqueue + overnight batch for **research** and **experiment** items. Companion to the Cursor Automation "Overnight research tasks".

| Kind | Job |
|:---|:---|
| `research` | Answer a question from web + repo evidence |
| `experiment` | Run a concrete check (tool, CLI, MCP, skill, API) and record pass/fail with evidence |

## Invocation

~~~text
/strict-overnight-research                         # status: pending count + last digest
/strict-overnight-research --queue "<topic>"       # add research item
/strict-overnight-research --queue                 # interactive research enqueue
/strict-overnight-research --experiment "<title>"  # add experiment item
/strict-overnight-research --experiment            # interactive experiment enqueue
/strict-overnight-research --run                   # overnight batch (automation mode)
/strict-overnight-research --digest                # latest morning digest
~~~

Aliases: `/queue-research` → `--queue`. `/queue-experiment` → `--experiment`.

## Data layout

| Path | Role |
|:---|:---|
| `docs/research/queue.md` | Pending + done checklist |
| `docs/research/results/` | One markdown report per completed item |
| `references/queue-format.md` | Queue schema (both kinds) |
| `references/report-format.md` | Research report schema |
| `references/experiment-format.md` | Experiment report schema |
| `references/automation-prompt.md` | Paste into Cursor Automations UI |

## Modes

### Status (default)

1. Read `docs/research/queue.md`.
2. Print: pending count by kind, next 1–3 items, newest result path (if any).
3. If pending = 0, suggest `--queue` or `--experiment`.

### Queue (research)

1. Append a pending item with `kind: research` per `references/queue-format.md`.
2. Confirm id + title. Do not research in this mode.

### Experiment (enqueue)

1. Append a pending item with `kind: experiment` per `references/queue-format.md`.
2. Require enough `steps` (or ask) so night mode can execute without inventing a protocol.
3. Confirm id + title. Do not run the experiment in this mode.

### Run (overnight / automation)

Follow `references/automation-prompt.md`. Cap: **1–3** pending items per run (oldest first, P0 > P1 > P2). Skip `blocked`.

For each selected item:

1. Branch on `kind`:
   - `research` → web + repo evidence → `references/report-format.md`
   - `experiment` → execute listed steps → `references/experiment-format.md`
2. Write `docs/research/results/YYYY-MM-DD-<slug>.md`.
3. Mark Done in `docs/research/queue.md` with report link.
4. Update automation memory: id, kind, date, one-line verdict, report path.

After the batch: open a PR if files changed; print morning digest; empty queue → memory note only, no PR.

### Digest

Newest reports: title + kind + verdict + path.

## Rules

1. Enqueue ≠ execute. Day modes never research or run experiments.
2. Night mode never invents topics — only drains the queue.
3. Experiments: follow listed steps; record real command output / exit codes; never fabricate pass/fail.
4. Prefer primary sources for research; prefer reproducible commands for experiments.
5. Missing credentials / tool / network → mark `blocked` with reason; continue the batch.
6. Experiments may install **local** deps only when the item says so; never push secrets; never attack systems.
7. 80/20: answer or verify; skip encyclopedia padding.
