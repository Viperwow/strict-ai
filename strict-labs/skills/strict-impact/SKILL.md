---
name: strict-impact
description: Multi-criteria task scoring. Evaluates a task across multiple scientific scoring methods (WSJF, ICE, RICE, ELR, Cost of Delay, BCR, Eisenhower), outputs composite score 0–100, severity verdict (Critical/High/Medium/Low/Skip), alignment with personal/team/company goals, and a business justification for managers. Use before starting work on a task to evaluate whether it is worth doing now, or when comparing tasks for prioritization. Triggers on /strict-impact.
---

# strict-impact

Scores a task across multiple evidence-based methods. Outputs composite score, severity, goal alignment, and a business justification for managers.

## Invocation

~~~
/strict-impact [task description or ID] [methods]
/strict-impact [task] --fast [methods]
/strict-impact --rescore [methods]
/strict-impact --list
~~~

**Rules:**
- No flag → full deep scoring using all methods (or specified subset).
- `--fast` → approximate scoring; no deep analysis; default methods: ICE + WSJF; if methods specified, use those.
- `--rescore` → re-score an existing task; if methods specified, keep old scores for unspecified methods and overwrite only specified ones; composite recalculated from merged results.
- `--list` → display all available scoring methods with name, description, and when to use.
- Methods filter: optional comma-separated list of method IDs; works with any command.

Method IDs: `wsjf`, `ice`, `rice`, `elr`, `cod`, `bcr`, `eisenhower`

## Data source order

1. Session context — task data, goals, weights, and existing scores already in session
2. Saved files — goals file, existing scoring files for this task
3. Ask the user — only when data is absent from 1 and 2

## Routing

~~~
Task data in session context?
  └─ Yes → AUTO mode
  └─ No  → ask: "Describe the task in one or two sentences." → AUTO mode

Goals + weights in session context or saved file?
  └─ Yes → use them
  └─ No  → ask for minimum context:
           "What are the top 1–2 goals this task should support?"

Project directory determinable?
  └─ Yes → will write scoring file to {project-root}/strict-ai/scoring/
  └─ No  → ask: "Where should I save the scoring result?"
           Do not proceed without an answer.
~~~

## AUTO mode — full scoring

1. Extract from context: task description, type, deadline, tracker priority/severity.
2. Extract goals and weights from context or file.
3. For each method (or specified subset):
   a. Score each input dimension 1–5 based on task analysis.
   b. Apply method formula.
   c. Normalize to 0–100 using the method's normalization formula.
   d. Record the key reason driving that method's score.
4. Apply method weights (from `references/scoring-output.md`). Redistribute proportionally if subset used.
5. Calculate composite score = Σ (normalized_score × method_weight).
6. Determine severity tier from composite (thresholds in `references/scoring-output.md`).
7. If tracker priority/severity is present in context and conflicts with composite severity — flag it and explain why.
8. Calculate alignment: for each goal dimension (personal, team, company), assess how directly this task supports it. Express as %.
9. Generate output (see Output Format).
10. Save scoring file using format from `references/scoring-output.md`.

## --fast mode

Use only specified methods (default: ICE + WSJF).
Estimate all inputs with brief gut-check reasoning, no deep analysis.
Output the same format but mark as `[FAST MODE — approximate]`.
Do not save file unless the user asks.

## --rescore mode

1. Load existing scoring file for this task.
2. Re-run only specified methods.
3. Merge results: replace rows for re-scored methods, keep all other rows.
4. Redistribute method weights proportionally across merged set.
5. Recalculate composite.
6. Append changelog entry per format in `references/scoring-output.md`.

## --list mode

Display a table of all available scoring methods:

| ID | Method | Measures | Best for |
|----|--------|----------|----------|
| wsjf | WSJF | Economic priority, value/delay ratio | Comparing tasks with different urgency |
| ice | ICE | Quick triage: impact, confidence, ease | Fast pre-filtering |
| rice | RICE | Scope-adjusted impact vs effort | User-facing features |
| elr | ELR | Risk elimination value | Security, billing, data integrity |
| cod | CoD | Value lost per unit of delay | Deadline-sensitive work |
| bcr | BCR | Benefit relative to cost | Effort-heavy or low-value tasks |
| eisenhower | Eisenhower | Urgency vs importance separation | Sanity-checking "urgent" tasks |

## Low score behaviour

When composite severity is **Skip** or **Low**:

1. State clearly: "This task scores [X/100] — [severity]. It is not recommended at this time."
   Provide the primary reason from the scoring breakdown.

2. If existing scoring files are present in this project:
   Show the top 3 tasks by composite score with one-line summaries.

3. If no existing scored tasks:
   Run `--fast` on up to 2 alternative tasks mentioned in session context.
   Show their fast scores and summaries.

## Output Format

~~~
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPACT SCORE: 74/100  ·  HIGH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Key insights:
• <primary reason driving this score>
• <main risk or cost signal>
• <alignment note>

Scoring breakdown:
| Method      | Normalized | Weight | Contribution | Key reason                    |
|-------------|----------:|-------:|-------------:|-------------------------------|
| WSJF        |        82 |   0.20 |         16.4 | High value-to-job-size ratio  |
| ICE         |        71 |   0.10 |          7.1 | Moderate confidence           |
| RICE        |        68 |   0.15 |         10.2 | Limited reach but high impact |
| ELR         |        79 |   0.20 |         15.8 | High failure probability      |
| CoD         |        65 |   0.15 |          9.8 | Moderate time sensitivity     |
| BCR         |        60 |   0.10 |          6.0 | Reasonable benefit/cost ratio |
| Eisenhower  |        72 |   0.10 |          7.2 | Important, moderately urgent  |

Composite: 72.5 → 73/100

Alignment:
  Personal goals:   ████░░  68%  — supports Q3 delivery target
  Team goals:       █████░  82%  — directly tied to sprint OKR
  Company goals:    ████░░  71%  — contributes to retention metric

Severity: HIGH
  (Tracker: Medium → upgraded — ELR signals high failure risk)

Business justification:
  <2–3 sentences: what the task delivers for the business, what risk it removes,
   why doing it now rather than later — written for a manager, not a developer.>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
Saved: strict-ai/scoring/<task-id>-<summary>.md
~~~

## Scoring method references

Each method's formula, inputs, normalization, and example are defined in `references/`.
Adding a new method = adding one `references/method-<id>.md` file.
Use `--list` to display all available methods.
