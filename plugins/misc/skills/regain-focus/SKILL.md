---
name: regain-focus
description: Help the user return to a specific task after a break. Rebuild personal understanding of what was being done, where the work was heading, how much is left, and where the work drifted off scope. Combine session discussion history with project change history as mandatory evidence. Produce a factual Task Summary, a directional Work Vector Summary, a completion Progress Bar, a Scope Drift note, concrete Next Steps, relevant skill suggestions (after actually checking what skills exist), and a short Focus Block. Use when the user says "regain focus", "return focus", "focusify", "I forgot what I was doing", "where was I", "what's next on this task", "resume this task", runs `/regain-focus`, or asks for a quick recovery summary on a named task / Jira key / implied current task.
---

# regain-focus

Use this skill when the user is returning to a task after a break and their personal memory of the task is thin. The primary goal is fast recovery of understanding — what the task is, what was already done, what direction the work was heading, how close to done it is, where it drifted, and what the smallest useful next step is.

This skill is task-scoped. "Task" usually means a concrete current task, planned task, Jira issue, or a task implied by the current session. It is **not** a general project status review.

## Required evidence sources

Every run must combine evidence from both streams. Neither is optional.

### Session evidence
- recent user messages
- recent assistant messages
- decisions stated in the discussion
- unresolved questions
- stated blockers, goals, constraints, intent

### Project evidence
- current working tree state
- changed files (staged, unstaged, untracked)
- recent diffs
- recent commit history
- file names and touched areas that indicate feature direction

### Optional supporting evidence
When available, also use:
- Jira issue details, description, acceptance criteria, comments, worklogs
- local project docs
- memory files
- architecture notes
- task tracker context

Do not rely on a single source when multiple sources are available. If a source is unreachable, note that briefly and continue with what is available.

## Inputs

- Jira key, e.g. `PROJ-123`
- short task description, e.g. `react table pagination`
- no explicit argument — infer the most likely active task from the session and project activity; if multiple candidates exist, pick the strongest and briefly mention the uncertainty

## Energy Check (before output)

At the very start of the run, right after the task is identified, ask one short question and read time-of-day automatically. The answer sizes the final Action Plan.

Ask exactly one line, compact:

```
Energy right now? (low / mid / high) — or skip
```

If the user answers, use it. If the user skips or does not answer within the same turn, infer a default from time-of-day only and mark it as inferred.

Time-of-day reading (local time, user-calibrated):
- `morning` (06:00–10:00) — default energy: `low` (waking, slow ramp)
- `midday` (10:00–15:00) — default energy: `high` (peak productive window)
- `afternoon` (15:00–18:00) — default energy: `mid` (post-peak, still workable)
- `evening` (18:00–22:00) — default energy: `low`
- `late` (22:00–06:00) — default energy: `low`

Self-report always overrides the default.

Step-sizing rules driven by `energy × time-of-day`:

| Energy | Action Plan size | Total block | Bias |
| :----- | :--------------- | :---------- | :--- |
| `low`  | 1 tiny step      | 10–15 min   | clarify, capture state, unblock |
| `mid`  | 1–2 steps        | 20–25 min   | execute one concrete piece |
| `high` | 2–3 steps        | 30–40 min   | execute the core move end-to-end |

Time-of-day modifier: in `late` window, cap at `low` regardless of the self-report, and bias the plan toward capture + stopping-point notes so the user can put the task down cleanly.

Always render a single line at the top of the output showing what was used, e.g. `Energy: mid (self-report) · Time: afternoon` or `Energy: low (inferred from evening) · Time: evening`.

## Output format

Always emit the answer in this exact structure and order.

### Task Summary
Factual summary of what the user already did on the task.

Must answer:
- what was completed
- what is currently in progress
- what remains unclear
- what decisions were made
- what files, modules, or subsystems were involved

Concrete and evidence-based. Do not speculate unless uncertainty is explicitly marked.

### Work Vector Summary
Directional summary of where the work was heading. Separate from Task Summary — do not merge.

Must answer:
- what the user appears to be trying to achieve
- what sequence of intent is visible in the work
- what momentum the work shows
- what the likely trajectory is
- what larger goal the partial work seems to support

Interpretive, but grounded in evidence from both session history and project activity.

Always include two short sub-lines at the end of this section, based on evidence:
- **Worked on:** the concrete areas actively touched (files, modules, subsystems, topics).
- **Hit:** the obstacles, frictions, dead ends, or open questions the user ran into.

Keep each to one compact line. Skip a sub-line only when there is genuinely nothing to report — do not invent content.

### Progress Bar
A single-line completion estimate for the task.

Format:
```
Progress: [█████░░░░░] 50% — <short label>
```

Rules:
- Use 10 cells. Filled cells = `█`, empty cells = `░`.
- Percentage = estimated completion against the task's stated or implied scope (acceptance criteria if available; otherwise inferred from the Work Vector and observed state).
- `<short label>` names the current stage, e.g. `scaffolding done, wiring data`, `API contract unresolved`, `tests pending`, `ready for review`.
- When scope is uncertain, render `~N%` and add a trailing ` (rough)` marker.
- When the task is clearly blocked, append ` — blocked: <reason>` to the label.

Directly under the bar, render the checkpoints that drove the estimate as a **table**, grouped by status. Keep rows concrete and short.

Table format:

| Status | Item |
| :--- | :--- |
| done | <checkpoint> |
| done | <checkpoint> |
| in progress | <checkpoint> |
| pending | <checkpoint> |

Row order: all `done` rows first, then `in progress`, then `pending`. Within a status, keep the order that best reflects the flow of the task (earliest-to-latest checkpoint). Do not use bullet lists for checkpoints — always the table.

### Scope Drift
A short note that identifies work that appears to have wandered off the task's real scope.

Include an entry only when there is real evidence of drift. If nothing drifted, write a single line: `No drift detected.`

Each drift entry has:
- **What drifted** — the off-scope activity, file, refactor, or tangent.
- **Why it is off scope** — short reason tied to the task's actual goal.
- **Recommendation** — one of: `drop`, `defer`, `split into separate task`, `keep (still on scope, false alarm)`.

Keep this section sharp. The goal is to help the user stop spending attention on things that do not move the current task forward.

### Action Plan
Merged next-steps-with-timing block. One section, not two. Each step has both a concrete action and its time box. Total matches the block size from the Energy Check table.

Rules:
- number of steps follows the Energy × Time sizing table (1 tiny / 1–2 / 2–3).
- always include a short closing step: validate result or capture a clean stopping point.
- prefer the smallest useful continuation; prioritize the strongest unblocker.
- when energy is `high`, bias toward an execution step, not more analysis.
- when energy is `low` or time is `late`, bias toward clarify / capture / leave-clean-notes.

Format: header line + table. No numbered bullet list.

Header line:

```
Action Plan — total <N>m, energy <level>
```

Table:

| # | Time | Action | Why |
| :--- | :--- | :--- | :--- |
| 1 | <Nm> | <concrete action> | <one-line reason> |
| 2 | <Nm> | <concrete action> | <one-line reason> |
| 3 | <Nm> | <close: validate / capture stopping point> | <one-line reason> |

Time slots must sum to the total block size. Keep each action concrete enough to start immediately. The final row is always the closing validate/capture step.

### Suggested Skills
Recommend relevant skills the user could invoke next.

**Important:** do not hard-code skill names. Skill names in this environment change over time and many may not exist yet. At the moment this section is produced:
1. First, check what skills are actually available in the current environment (use the mechanism the harness provides — for example the skills listed in system reminders, or a skill-finder tool if one exists).
2. Then pick skills that clearly match the Suggested Next Steps.
3. Name each skill exactly as it appears in the available list. Add a very short reason per skill.
4. If no matching skill exists, say so plainly and skip this section — do not invent names.

This check can happen at the most natural moment in the flow — it is not required to be the first step, but it must happen before any skill is named.

## Operating procedure

### Step 1 — Identify the task
- If the user passed a Jira key or task description, treat that as the anchor. Connect both evidence streams to it.
- If no explicit task is given, infer the most likely active task from session and project evidence. If multiple candidates exist, pick the strongest and briefly note the uncertainty.

### Step 2 — Energy Check
Ask the one-line energy question. Read current local time. Resolve to a row in the Energy × Time sizing table. This drives the Action Plan size at the end.

### Step 3 — Collect both evidence streams
Always inspect session history and project/code history. Do not skip either. Pull optional sources when cheap and relevant.

### Step 4 — Build Task Summary
Factual. Based on actual evidence.

### Step 5 — Build Work Vector Summary
Directional. Separate section. Grounded in evidence.

### Step 6 — Compute Progress Bar
Derive the percentage from concrete checkpoints. Prefer acceptance criteria when available; otherwise use the Work Vector and visible state. Mark rough estimates as `~N% (rough)`.

### Step 7 — Detect Scope Drift
Compare observed activity against the task's real goal. Flag anything that does not move the task forward. Recommend `drop`, `defer`, `split`, or `keep`. Write `No drift detected.` when clean.

### Step 8 — Build the Action Plan
Size it using the Energy × Time row from Step 2. Pick the smallest useful continuation consistent with that row. Keep actions concrete enough to start immediately. Include a closing validate/capture step.

### Step 9 — Suggest skills (if any fit)
Check what skills actually exist in the current environment first. Only then name skills that match the Action Plan steps. If nothing fits, skip the section.

## Quality requirements

- Always produce Task Summary **and** Work Vector Summary as separate sections.
- Always produce Progress Bar and Scope Drift.
- Always use both session evidence and project evidence together.
- Always run the Energy Check and render the energy/time header line.
- Action Plan size must match the Energy × Time sizing table — do not over-plan when energy is low, do not under-plan when energy is high.
- Next Steps and Focus Block are merged into the single Action Plan — never emit both.
- Never name a skill that has not been verified to exist in the current environment.
- Prefer concise, high-signal output.
- If evidence conflicts, mention the conflict briefly and trust the freshest signal most.
- Optimize for fast recovery, not exhaustive explanation.
- When the user seems ready to act, bias toward actionable next steps.

## Example response shape

Energy: mid (self-report) · Time: afternoon

## Task Summary
- Built the initial table skeleton.
- Selected TanStack Table.
- Started API integration, but the response shape is unresolved.
- Touched: `components/DataTable.tsx`, `hooks/useTableData.ts`.

## Work Vector Summary
- Moving from UI scaffolding toward a stable data contract.
- Trajectory suggests a shift from structure-first implementation to integration and validation.
- Larger goal: turn a prototype into a production-ready table flow.
- **Worked on:** `DataTable.tsx`, `useTableData.ts`, column config, fetch wiring.
- **Hit:** API response shape unresolved for sort/filter/pagination; blocked one wiring attempt.

## Progress
Progress: [██████░░░░] ~60% (rough) — API contract unresolved

| Status | Item |
| :--- | :--- |
| done | table skeleton |
| done | library choice (TanStack) |
| done | column config |
| in progress | fetch wiring |
| pending | sort/filter/pagination contract |
| pending | error states |
| pending | tests |

## Scope Drift
- **What drifted:** started extracting a generic `<Toolbar>` component.
  **Why off scope:** toolbar is not part of the table's acceptance criteria.
  **Recommendation:** defer — split into a separate task after the data contract is closed.

## Action Plan — total 25m, energy mid

| # | Time | Action | Why |
| :--- | :--- | :--- | :--- |
| 1 | 5m  | Define response contract for sort/filter/pagination | unblocks everything downstream |
| 2 | 15m | Wire fetch into table state for one happy path | smallest integration that proves the contract |
| 3 | 5m  | Validate happy path + note next stopping point | clean handoff for next session |

## Suggested Skills
_Checked available skills; no direct match for the next step — proceeding without a skill suggestion._
