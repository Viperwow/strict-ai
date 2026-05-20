# Scoring Output Format

Scoring result files are written by strict-impact after task evaluation.

## Location

`{project-root}/strict-ai/scoring/<task-id>-<summary>.md`

- `task-id`: tracker ID when known (e.g. `TASK-42`); omit if unavailable
- `summary`: max 5 words, kebab-case, derived from task description
- `project-root`: current working directory of the session

If the project root cannot be determined, ask the user before writing.

## Method weights (defaults)

When all methods are used, apply these weights. They must sum to 1.0.

| Method      | ID          | Default weight |
|-------------|-------------|---------------:|
| WSJF        | wsjf        | 0.20           |
| ICE         | ice         | 0.10           |
| RICE        | rice        | 0.15           |
| ELR         | elr         | 0.20           |
| Cost of Delay | cod       | 0.15           |
| BCR         | bcr         | 0.10           |
| Eisenhower  | eisenhower  | 0.10           |

When a subset of methods is used, redistribute weights proportionally so they sum to 1.0.

## Severity thresholds

| Composite score | Severity |
|----------------:|----------|
| 85–100          | Critical |
| 65–84           | High     |
| 40–64           | Medium   |
| 20–39           | Low      |
| 0–19            | Skip     |

## File format

~~~markdown
---
task: <task-id or "none">
summary: <short summary>
created: <ISO 8601 with timezone>
updated: <ISO 8601 with timezone>
composite: <0-100 integer>
severity: critical|high|medium|low|skip
methods_used:
  - wsjf
  - ice
  - rice
  - elr
  - cod
  - bcr
  - eisenhower
---

# Score: <task summary>

## Scoring Breakdown

| Method      | Normalized | Weight | Contribution | Key reason                     |
|-------------|----------:|-------:|-------------:|-------------------------------|
| WSJF        |        82 |   0.20 |         16.4 | High business value, low cost  |
| ICE         |        71 |   0.10 |          7.1 | Good impact, moderate ease     |
| ...         |           |        |              |                                |

**Composite: XX/100**

## Alignment

| Dimension          | Score | Reason                              |
|--------------------|------:|-------------------------------------|
| Personal goals     |   68% | Supports Q3 delivery target         |
| Team goals         |   82% | Directly tied to sprint OKR         |
| Company goals      |   71% | Contributes to retention metric     |

## Business Justification

<2–3 sentences: what the task delivers for the business, what risk it removes,
why now rather than later — written for a manager, not a developer.>

## Changelog

### <ISO 8601 with timezone> — scored
> Methods: wsjf, ice, rice, elr, cod, bcr, eisenhower
> Reason: initial scoring
~~~

## --rescore merge rules

1. Load existing scoring file.
2. Re-run only the specified methods; compute their new normalized scores.
3. Merge: replace rows for re-scored methods; keep all other rows unchanged.
4. Redistribute weights proportionally across the merged set.
5. Recalculate composite from the full merged set.
6. Append a changelog entry with ISO 8601 datetime, list of re-scored methods, and reason.
7. Changelog is append-only — never edit existing entries.
