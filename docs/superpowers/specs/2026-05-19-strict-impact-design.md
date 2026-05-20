# Design Spec: strict-goals + strict-impact

**Date:** 2026-05-19
**Status:** Draft
**Target package:** strict-labs (experimental)

---

## Problem

Task evaluation is done by feel. No structured method to answer:
- Is this task worth doing now?
- How impactful is it relative to cost?
- Does it align with personal, team, and company goals?
- What is the business justification for a manager?

---

## Solution

Two independent skills in `strict-labs`:

- **strict-goals** — manages personal, team, and company goals + scoring weights. Weekly review cadence.
- **strict-impact** — multi-criteria scoring of a task. Outputs composite score, severity verdict, business justification. Saves result to project scoring folder.

Skills are fully independent. The only channel between them — and between them and any other skill — is session context data.

---

## Approach: B (two skills, context-only coupling)

Rejected:
- A (monolith) — violates Single Responsibility
- C (three skills) — YAGNI; strict-report has no distinct use case yet

---

## File Structure

Supporting assets go in a `references/` subdirectory next to `SKILL.md` (skill-creator convention — keeps skill root clean when there are many supporting files).

```
strict-labs/
  skills/
    strict-goals/
      SKILL.md
      references/
        goals-format.md        ← format spec for the goals file
    strict-impact/
      SKILL.md
      references/
        method-wsjf.md
        method-ice.md
        method-rice.md
        method-elr.md
        method-cod.md
        method-bcr.md
        method-eisenhower.md
        scoring-output.md      ← format spec for scoring result files

~/.strict-ai/
  goals.md                          # goals + weights, written by strict-goals

{pwd}/strict-ai/scoring/
  <task-id>-<summary>.md            # scoring result, written by strict-impact
```

---

## Data Sources (both skills)

Data is consumed in this order:

1. Session context (highest — already present from prior skill runs, user messages, tracker data, VCS, plans, communication tools)
2. Saved files (goals file, existing scoring files)
3. Ask the user (only when data is absent from 1 and 2)

No skill hardcodes paths to another skill's output or references another skill by name.

---

## strict-goals

### Invocation

```
/strict-goals                        # show current goals + weights
/strict-goals --setup                # initial interactive setup
/strict-goals --review               # review both goals and weights
/strict-goals --review-goals         # review only goals
/strict-goals --review-weights       # review only weights
```

### Routing

```
Goals present in session context?
  └─ Yes → display; if age ≥ 7 days → suggest --review
  └─ No  → look for saved file
              └─ Found, fresh (<7 days) → load, display
              └─ Found, stale (≥7 days) → load, display, suggest --review
              └─ Not found              → SETUP mode
```

### SETUP mode

Interactive dialogue, one question at a time, wait for answer before next:

1. Personal goals for the quarter (1–3 items)
2. Team goals (1–3 items)
3. Company / product goals (1–3 items)
4. Which scoring criteria matter most (select from base list)
5. Weight for each selected criterion (scale 1–5)

After confirmation → save file with `goals:` and `weights:` blocks.

### REVIEW mode

Display current values. Interactive — change only requested blocks. Save with diff + updated date.

### goals.md format

Defined in `references/goals-format.md` (owned by strict-goals only).

```yaml
---
updated: 2026-05-19
---

goals:
  personal:
    - ...
  team:
    - ...
  company:
    - ...

weights:
  business_impact: 5
  user_impact: 4
  risk_reduction: 4
  strategic_alignment: 3
  urgency: 3
  effort_cost: 3
```

---

## strict-impact

### Invocation

```
/strict-impact [task description or ID] [methods]
/strict-impact [task] --fast [methods]
/strict-impact --rescore [methods]
/strict-impact --list
```

**Rules:**
- No flags → full deep scoring, all methods (or specified subset)
- `--fast` → approximate scoring, no deep analysis; default methods: ICE + WSJF; if methods specified → use those
- `--rescore` → re-run scoring; if methods specified → keep old scores for unspecified methods, overwrite only specified; composite recalculated from merged results
- `--list` → display available scoring methods with name, description, when to use
- Methods filter is always optional, comma-separated, works with any command

### Routing

```
Task data in session context?
  └─ Yes → AUTO mode
  └─ No  → ask for task description (1 question) → AUTO mode

Goals + weights in session context?
  └─ Yes → use them
  └─ No  → look for saved file → if absent or stale → ask (minimum set)

Project directory determinable?
  └─ No  → ask user where to write scoring file; do not proceed without answer
```

### AUTO mode — full scoring

1. Extract from context: task description, type, deadline, tracker priority/severity, goals, weights
2. Run all methods (or filtered subset) defined in `references/`
3. Normalize each method result to 0–100 scale
4. Apply weights → composite score
5. Determine severity tier: **Critical / High / Medium / Low / Skip**
6. Generate output (see Output Format)
7. Save to `{pwd}/strict-ai/scoring/<task-id>-<summary>.md`

### Severity tiers

| Tier     | Composite range | Meaning                        |
|----------|----------------:|-------------------------------|
| Critical | 85–100          | Do immediately, top priority  |
| High     | 65–84           | Do in current cycle           |
| Medium   | 40–64           | Schedule, not urgent          |
| Low      | 20–39           | Defer or deprioritize         |
| Skip     | 0–19            | Not worth doing now           |

Tracker severity/priority is read from context and can upgrade the verdict (e.g., tracker=Critical overrides composite=Medium → flag shown in output).

### Low score behaviour

When result is Skip or Low:
1. Warn: task not worth doing now, with reason
2. If other scored files exist in `scoring/` → show top-3 alternatives by score
3. If no other scored tasks → run `--fast` on 1–2 alternatives mentioned in context; show quick scores

### --rescore merge logic

- Load existing scoring file
- Re-run only specified methods
- Merge: new results overwrite matching methods, old results for other methods unchanged
- Recalculate composite from full merged set
- Append changelog entry with diff + date + reason

### Scoring methods

Each method lives in `references/method-<name>.md`. SKILL.md references the folder; adding a new `.md` file extends the method list automatically.

**Base methods:**

| ID           | Name                        | Default in --fast |
|--------------|-----------------------------|:-----------------:|
| `wsjf`       | Weighted Shortest Job First | ✓                 |
| `ice`        | ICE Score                   | ✓                 |
| `rice`       | RICE Score                  |                   |
| `elr`        | Expected Loss Reduction     |                   |
| `cod`        | Cost of Delay               |                   |
| `bcr`        | Benefit / Cost Ratio        |                   |
| `eisenhower` | Eisenhower Matrix           |                   |

### Output Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPACT SCORE: 74/100  ·  HIGH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Insights:
• <primary reason for this score>
• <main risk or cost signal>
• <alignment note>

Scoring breakdown:
| Method      | Score | Weight | Contribution | Key reason              |
|-------------|------:|-------:|-------------:|-------------------------|
| WSJF        |  82   |  0.25  |    20.5      | High CoD relative to... |
| ICE         |  71   |  0.15  |    10.7      | Confidence moderate...  |
| RICE        |  68   |  0.20  |    13.6      | Reach limited to...     |
| ELR         |  79   |  0.20  |    15.8      | P(failure)=0.3, high... |
| CoD         |  65   |  0.10  |     6.5      | Delay cost moderate...  |
| Eisenhower  |  70   |  0.10  |     7.0      | Important, not urgent   |

Composite: 74/100

Alignment:
  Personal:  ████░░  68%  — supports Q3 delivery goal
  Team:      █████░  82%  — directly tied to sprint OKR
  Company:   ████░░  71%  — contributes to retention metric

Severity: HIGH
  (Tracker: Medium → upgraded by ELR risk signal)

Business justification:
  <2–3 sentences: what the task delivers for the business, what risk it removes,
   why now rather than later — written for a manager, not a developer>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Scoring file format

Defined in `references/scoring-output.md`.

```markdown
---
task: <task-id>
summary: <short summary>
created: <ISO 8601>
updated: <ISO 8601>
composite: 74
severity: high
---

# Score: <task summary>

## Results
[table]

## Alignment
[alignment block]

## Business Justification
[text]

## Changelog
### <ISO 8601> — scored
[diff]
> Reason: initial scoring
```

---

## Scientific basis

Methods grounded in:
- WSJF / Cost of Delay — SAFe, Reinertsen
- ICE / RICE — product prioritization literature
- Expected Loss Reduction — risk-based QA (Kopczyńska 2022, Silva 2017)
- Eisenhower Matrix — Kennedy 2022, Patzak 2025
- Benefit/Cost — Aeon 2021, Bedi 2023
- Goal alignment — Steegh 2025 (JBR), Barros 2024

Each method's `references/` file cites its source.

---

## Constraints

- Skills are independent: no cross-skill references, no shared code, no hardcoded paths to each other's output
- Session context is the integration layer
- Adding a scoring method = adding one `references/method-<name>.md` file
- DRY: shared format specs (goals-format.md, scoring-output.md) referenced, not duplicated
