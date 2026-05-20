# strict-goals + strict-impact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create two independent skills — `strict-goals` (goal/weight management) and `strict-impact` (multi-criteria task scoring) — in `strict-labs`.

**Architecture:** Pure markdown skills. No shared code. Skills communicate only via session context. strict-goals owns the goals config format. strict-impact owns scoring method references and output format. Each skill is independently invocable and testable.

**Tech Stack:** SKILL.md convention, YAML frontmatter, `references/` subdirectory pattern (skill-creator convention).

**Spec:** `docs/superpowers/specs/2026-05-19-strict-impact-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `strict-labs/skills/strict-goals/SKILL.md` | Goals/weights management skill |
| `strict-labs/skills/strict-goals/references/goals-format.md` | Goals file format spec |
| `strict-labs/skills/strict-impact/SKILL.md` | Task scoring skill |
| `strict-labs/skills/strict-impact/references/scoring-output.md` | Scoring result file format spec |
| `strict-labs/skills/strict-impact/references/method-wsjf.md` | WSJF scoring method |
| `strict-labs/skills/strict-impact/references/method-ice.md` | ICE scoring method |
| `strict-labs/skills/strict-impact/references/method-rice.md` | RICE scoring method |
| `strict-labs/skills/strict-impact/references/method-elr.md` | Expected Loss Reduction method |
| `strict-labs/skills/strict-impact/references/method-cod.md` | Cost of Delay method |
| `strict-labs/skills/strict-impact/references/method-bcr.md` | Benefit/Cost Ratio method |
| `strict-labs/skills/strict-impact/references/method-eisenhower.md` | Eisenhower Matrix method |
| `strict-labs/.claude-plugin/plugin.json` | Plugin registration (update) |

---

## Task 1: Directory structure + goals-format.md

**Files:**
- Create: `strict-labs/skills/strict-goals/references/goals-format.md`
- Create: `strict-labs/skills/strict-impact/references/` (directory)

- [ ] **Step 1.1: Create directories**

```bash
mkdir -p strict-labs/skills/strict-goals/references
mkdir -p strict-labs/skills/strict-impact/references
```

- [ ] **Step 1.2: Write goals-format.md**

Create `strict-labs/skills/strict-goals/references/goals-format.md`:

```markdown
# Goals File Format

The goals file stores personal, team, and company goals alongside scoring weights.

## Location

User home directory: `~/.strict-ai/goals.md`

The file is created and maintained by strict-goals. Any skill or agent that needs
goal context reads it as a standard file source — no special coupling required.

## Format

~~~yaml
---
updated: YYYY-MM-DD
---

goals:
  personal:
    - "..."        # 1–3 action-oriented goal statements
  team:
    - "..."
  company:
    - "..."

weights:
  business_impact: 5    # 1–5; how much business value matters
  user_impact: 4        # 1–5; how much end-user benefit matters
  risk_reduction: 4     # 1–5; how much risk mitigation matters
  strategic_alignment: 3  # 1–5; how much OKR/goal alignment matters
  urgency: 3            # 1–5; how much time-sensitivity matters
  effort_cost: 3        # 1–5; how much implementation cost matters
~~~

## Rules

- `updated`: ISO 8601 date. Goals are considered stale when age ≥ 7 days.
- Each goal entry: one sentence, action-oriented ("Deliver X by Q3").
- All six weight keys are required. Default value is 3 for any missing key.
- Weights are integers 1–5. Higher = criterion contributes more to composite score.
- Goals are qualitative context; weights are quantitative inputs to scoring.
```

- [ ] **Step 1.3: Verify**

Confirm the file has: location spec, format block, all 6 weight keys, rules section.

- [ ] **Step 1.4: Commit**

```bash
git add strict-labs/skills/strict-goals/references/goals-format.md
git commit -m "feat(strict-labs): add goals-format reference for strict-goals"
```

---

## Task 2: strict-goals SKILL.md

**Files:**
- Create: `strict-labs/skills/strict-goals/SKILL.md`

- [ ] **Step 2.1: Write strict-goals SKILL.md**

Create `strict-labs/skills/strict-goals/SKILL.md`:

```markdown
---
name: strict-goals
description: Manage personal, team, and company goals with scoring weights for task evaluation. Use to set up, view, or review goals and weights. Invoke before task scoring when goals are absent from context, on weekly review cadence, or any time goals need updating. Triggers on /strict-goals.
---

# strict-goals

Sets up and maintains goal context used when evaluating task impact and alignment.

## Invocation

~~~
/strict-goals                    # view current goals + weights
/strict-goals --setup            # first-time interactive setup
/strict-goals --review           # review and update both goals and weights
/strict-goals --review-goals     # review only goals
/strict-goals --review-weights   # review only weights
~~~

## Data source order

1. Session context — goals already loaded or discussed this session
2. Saved goals file in user home directory
3. Ask the user — SETUP mode

## Routing

~~~
Goals present in session context?
  └─ Yes → display
           if age ≥ 7 days → suggest --review
  └─ No  → look for saved goals file
              └─ Found, fresh (<7 days) → load, display
              └─ Found, stale (≥7 days) → load, display, suggest --review
              └─ Not found              → SETUP mode
~~~

## SETUP mode

Interactive dialogue. One question at a time. Wait for the answer before asking the next.

**Q1:** "What are your personal goals for this quarter? Give 1–3 goal statements."

**Q2:** "What are your team's current goals? Give 1–3 goal statements."

**Q3:** "What are your company or product goals this quarter? Give 1–3 goal statements."

**Q4:** "Which of the following criteria matter most when you evaluate tasks?
Select all that apply:
- business_impact (business value delivered)
- user_impact (benefit to end users)
- risk_reduction (defect/incident prevention)
- strategic_alignment (fit with OKRs/roadmap)
- urgency (time-sensitivity, cost of delay)
- effort_cost (implementation cost)"

**Q5:** For each selected criterion from Q4:
"How important is [criterion] to you? (1 = least, 5 = most)"
Ask one criterion at a time.

After collecting all answers, display summary:

~~~
Goals:
  Personal:  [list]
  Team:      [list]
  Company:   [list]

Weights:
  business_impact:      X
  user_impact:          X
  risk_reduction:       X
  strategic_alignment:  X
  urgency:              X
  effort_cost:          X

Confirm? [yes / edit: ...]
~~~

On confirmation → save file using format from `references/goals-format.md`.
On `edit: <field> = <value>` → apply change, redisplay, confirm again.

## REVIEW mode

Display current goals and weights. Ask: "What would you like to update? (goals / weights / both)"

For each selected block, walk through the relevant questions from SETUP interactively.
Apply changes, display diff, ask for confirmation. Save with updated date.

## File format

Defined in `references/goals-format.md`.
```

- [ ] **Step 2.2: Verify**

Confirm SKILL.md has: valid frontmatter (name + description), Invocation section, Data source order, Routing decision tree, SETUP interactive flow with 5 questions, REVIEW mode, file format reference.

- [ ] **Step 2.3: Commit**

```bash
git add strict-labs/skills/strict-goals/SKILL.md
git commit -m "feat(strict-labs): add strict-goals skill"
```

---

## Task 3: scoring-output.md

**Files:**
- Create: `strict-labs/skills/strict-impact/references/scoring-output.md`

- [ ] **Step 3.1: Write scoring-output.md**

Create `strict-labs/skills/strict-impact/references/scoring-output.md`:

```markdown
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
```

- [ ] **Step 3.2: Verify**

Confirm file has: location spec, method weights table (sum = 1.0), severity thresholds, file format with all sections, rescore merge rules.

- [ ] **Step 3.3: Commit**

```bash
git add strict-labs/skills/strict-impact/references/scoring-output.md
git commit -m "feat(strict-labs): add scoring-output reference for strict-impact"
```

---

## Task 4: method-wsjf.md + method-ice.md

**Files:**
- Create: `strict-labs/skills/strict-impact/references/method-wsjf.md`
- Create: `strict-labs/skills/strict-impact/references/method-ice.md`

- [ ] **Step 4.1: Write method-wsjf.md**

```markdown
# WSJF — Weighted Shortest Job First

**Source:** SAFe framework; Reinertsen, *The Principles of Product Development Flow* (2009).

**Measures:** Economic priority — how much value is lost per unit of time if the job is delayed.

**When to use:** When comparing multiple tasks and time-sensitivity of value delivery matters.

**When not to use:** When all tasks have the same urgency or job size is irrelevant.

---

## Inputs (score each 1–5)

| Input | Description | 1 | 5 |
|-------|-------------|---|---|
| **Business Value (BV)** | Direct business or revenue impact | Minimal | Critical |
| **Time Criticality (TC)** | How fast value decays if delayed | Stable indefinitely | Expires within days |
| **Risk/Opportunity Reduction (ROR)** | Risk removed or opportunity unlocked | None | Eliminates major risk |
| **Job Size (JS)** | Effort to complete (inverse — smaller = better) | Months of work | Hours of work |

In `--fast` mode: estimate all four inputs with a 30-second gut check. No deep analysis.

---

## Formula

```
WSJF_raw = (BV + TC + ROR) / JS
```

Range: min = (1+1+1)/5 = 0.6 · max = (5+5+5)/1 = 15.0

## Normalization to 0–100

```
WSJF_score = ((BV + TC + ROR) / JS - 0.6) / (15.0 - 0.6) × 100
           = ((BV + TC + ROR) / JS - 0.6) / 14.4 × 100
```

Round to nearest integer.

---

## Example

Task: Add automated retry logic to payment processor.
- BV = 5 (payments failing = revenue loss)
- TC = 4 (each day of delay costs revenue)
- ROR = 4 (reduces incident probability significantly)
- JS = 2 (small, self-contained change)

```
WSJF_raw = (5 + 4 + 4) / 2 = 6.5
WSJF_score = (6.5 - 0.6) / 14.4 × 100 = 40.97 → 41/100
```
```

- [ ] **Step 4.2: Write method-ice.md**

```markdown
# ICE Score

**Source:** Sean Ellis, GrowthHackers (2015). Widely used in product growth and prioritization.

**Measures:** Quick triage priority — impact of doing it, confidence in the estimate, ease of execution.

**When to use:** Fast initial filtering. Best for `--fast` mode and pre-scoring alternatives.

**When not to use:** When effort estimation matters significantly — ICE treats ease as binary.

---

## Inputs (score each 1–5)

| Input | Description | 1 | 5 |
|-------|-------------|---|---|
| **Impact (I)** | Value delivered if it works | Negligible | Game-changing |
| **Confidence (C)** | Certainty that impact estimate is accurate | Guessing | Evidence-backed |
| **Ease (E)** | How easy to implement | Months, complex | Hours, trivial |

In `--fast` mode: this is the primary method. Gut-estimate all three.

---

## Formula

```
ICE_raw = I × C × E
```

Range: min = 1×1×1 = 1 · max = 5×5×5 = 125

## Normalization to 0–100

```
ICE_score = (I × C × E - 1) / 124 × 100
```

Round to nearest integer.

---

## Example

Task: Add dark mode toggle.
- I = 2 (nice-to-have, won't move business metrics)
- C = 4 (confident it's wanted, user requests exist)
- E = 3 (moderate — CSS work, no backend changes)

```
ICE_raw = 2 × 4 × 3 = 24
ICE_score = (24 - 1) / 124 × 100 = 18.5 → 19/100
```
```

- [ ] **Step 4.3: Verify both files**

Each must have: Source citation, Measures, When to use/not use, Inputs table with 1/5 anchors, Formula, Normalization formula, Example with numbers.

- [ ] **Step 4.4: Commit**

```bash
git add strict-labs/skills/strict-impact/references/method-wsjf.md
git add strict-labs/skills/strict-impact/references/method-ice.md
git commit -m "feat(strict-labs): add WSJF and ICE scoring method references"
```

---

## Task 5: method-rice.md + method-elr.md

**Files:**
- Create: `strict-labs/skills/strict-impact/references/method-rice.md`
- Create: `strict-labs/skills/strict-impact/references/method-elr.md`

- [ ] **Step 5.1: Write method-rice.md**

```markdown
# RICE Score

**Source:** Intercom (2016). *RICE: Simple prioritization for product managers.*

**Measures:** Scope-adjusted impact — how many people are affected, by how much, with what confidence, relative to effort.

**When to use:** When user reach and effort are meaningfully different across tasks.

**When not to use:** Internal tooling or infra tasks where "reach" is not applicable.

---

## Inputs (score each 1–5)

| Input | Description | 1 | 5 |
|-------|-------------|---|---|
| **Reach (R)** | Number of users or stakeholders impacted | 1 person | All users |
| **Impact (I)** | Magnitude of effect per user | Trivial improvement | Massive improvement |
| **Confidence (C)** | Certainty in reach and impact estimates | Wild guess | Data-backed |
| **Effort (E)** | Total work required (inverse — less effort = higher score) | Months | Hours |

In `--fast` mode: estimate each in under 30 seconds.

---

## Formula

```
RICE_raw = (R × I × C) / E
```

Range: min = (1×1×1)/5 = 0.2 · max = (5×5×5)/1 = 125.0

## Normalization to 0–100

```
RICE_score = (RICE_raw - 0.2) / (125.0 - 0.2) × 100
           = (RICE_raw - 0.2) / 124.8 × 100
```

Round to nearest integer.

---

## Example

Task: Improve search result ranking algorithm.
- R = 4 (70% of users use search regularly)
- I = 3 (noticeable improvement in task success rate)
- C = 3 (some A/B data, not conclusive)
- E = 4 (significant ML work)

```
RICE_raw = (4 × 3 × 3) / 4 = 9.0
RICE_score = (9.0 - 0.2) / 124.8 × 100 = 7.05 → 7/100
```
```

- [ ] **Step 5.2: Write method-elr.md**

```markdown
# ELR — Expected Loss Reduction

**Source:** Adapted from risk-based testing theory. Kopczyńska et al. (2022), *On the benefits and problems related to using Definition of Done*; Silva et al. (2017), *A systematic review on the use of Definition of Done*.

**Measures:** How much expected damage (probability × impact of failure) this task removes.

**When to use:** Risk-heavy tasks — security, billing, data integrity, production stability.

**When not to use:** Low-stakes cosmetic or content changes.

---

## Inputs (score each 1–5)

| Input | Description | 1 | 5 |
|-------|-------------|---|---|
| **Failure Probability (P)** | Likelihood a defect causes an incident if this task is not done | Very unlikely | Near certain |
| **Failure Impact (I)** | Severity of the incident (users, revenue, data, reputation) | Minor annoyance | Catastrophic |
| **Risk Reduction (RR)** | How much doing this task reduces failure probability | Negligible | Eliminates the risk |

In `--fast` mode: estimate P and I first; if both are low (≤2), ELR = low, skip detailed RR.

---

## Formula

```
ELR_raw = P × I × RR
```

Range: min = 1×1×1 = 1 · max = 5×5×5 = 125

## Normalization to 0–100

```
ELR_score = (P × I × RR - 1) / 124 × 100
```

Round to nearest integer.

---

## Example

Task: Fix missing input validation on admin API endpoint.
- P = 4 (admin APIs are regularly targeted; no auth bypass found yet but exposure is real)
- I = 5 (admin access = full data exposure)
- RR = 5 (adds proper validation, eliminates the vector)

```
ELR_raw = 4 × 5 × 5 = 100
ELR_score = (100 - 1) / 124 × 100 = 79.8 → 80/100
```
```

- [ ] **Step 5.3: Verify both files**

Each must have: Source, Measures, When to use/not use, Inputs table, Formula, Normalization, Example with numbers.

- [ ] **Step 5.4: Commit**

```bash
git add strict-labs/skills/strict-impact/references/method-rice.md
git add strict-labs/skills/strict-impact/references/method-elr.md
git commit -m "feat(strict-labs): add RICE and ELR scoring method references"
```

---

## Task 6: method-cod.md + method-bcr.md + method-eisenhower.md

**Files:**
- Create: `strict-labs/skills/strict-impact/references/method-cod.md`
- Create: `strict-labs/skills/strict-impact/references/method-bcr.md`
- Create: `strict-labs/skills/strict-impact/references/method-eisenhower.md`

- [ ] **Step 6.1: Write method-cod.md**

```markdown
# Cost of Delay (CoD)

**Source:** Reinertsen, *The Principles of Product Development Flow* (2009). Black, *Project to Product* (2018).

**Measures:** Value lost per unit of time if this task is delayed. Captures urgency in economic terms.

**When to use:** When tasks have hard deadlines, time-sensitive opportunities, or compounding risk.

**When not to use:** When delay cost is genuinely uniform across all options being compared.

---

## Inputs (score each 1–5)

| Input | Description | 1 | 5 |
|-------|-------------|---|---|
| **Business Value (BV)** | Total value the task delivers when done | Negligible | Critical revenue/risk |
| **Time Sensitivity (TS)** | How fast value decays or risk grows if delayed | Stable indefinitely | Value expires within days |

In `--fast` mode: focus on TS. If TS ≤ 2, CoD is low regardless of BV.

---

## Formula

```
CoD_raw = BV × TS
```

Range: min = 1×1 = 1 · max = 5×5 = 25

## Normalization to 0–100

```
CoD_score = (BV × TS - 1) / 24 × 100
```

Round to nearest integer.

---

## Example

Task: Fix expiring SSL certificate before renewal deadline (3 days).
- BV = 5 (expired cert = site down = revenue loss)
- TS = 5 (hard deadline, no flexibility)

```
CoD_raw = 5 × 5 = 25
CoD_score = (25 - 1) / 24 × 100 = 100/100
```
```

- [ ] **Step 6.2: Write method-bcr.md**

```markdown
# BCR — Benefit/Cost Ratio

**Source:** Classic decision analysis. Aeon, Faber & Panaccio (2021), *Does time management work? A meta-analysis*, PLOS ONE. Bedi & Sass (2023), *A meta-analytic review*, Journal of Social Psychology.

**Measures:** Whether a task delivers more value than it costs. Identifies waste and low-ROI work.

**When to use:** When effort cost varies significantly across options. Good for comparing refactoring vs. feature work.

**When not to use:** When all tasks have similar cost — BCR loses discriminating power.

---

## Inputs (score each 1–5)

**Benefit inputs:**

| Input | Description | 1 | 5 |
|-------|-------------|---|---|
| **Business Impact (BI)** | Value to the business | None | Critical |
| **User Impact (UI)** | Value to end users | None | Essential |
| **Risk Reduction (RR)** | Defect or incident prevention | None | Eliminates major risk |

**Cost inputs:**

| Input | Description | 1 | 5 |
|-------|-------------|---|---|
| **Time Cost (TC)** | Implementation time | < 1 hour | > 1 week |
| **Complexity (CX)** | Technical complexity | Trivial | Highly complex |
| **Cognitive Load (CL)** | Mental overhead, coordination | Solo, obvious | Cross-team, ambiguous |

In `--fast` mode: estimate totals, not individual dimensions.

---

## Formula

```
Benefit = BI + UI + RR          (range: 3–15)
Cost    = TC + CX + CL          (range: 3–15)
BCR_raw = Benefit / Cost
```

Range: min = 3/15 = 0.2 · max = 15/3 = 5.0

## Normalization to 0–100

```
BCR_score = (Benefit/Cost - 0.2) / (5.0 - 0.2) × 100
           = (Benefit/Cost - 0.2) / 4.8 × 100
```

Round to nearest integer.

---

## Example

Task: Update a single UI label (copy change).
- BI=1, UI=2, RR=1 → Benefit = 4
- TC=1, CX=1, CL=1 → Cost = 3

```
BCR_raw = 4 / 3 = 1.33
BCR_score = (1.33 - 0.2) / 4.8 × 100 = 23.5 → 24/100
```
```

- [ ] **Step 6.3: Write method-eisenhower.md**

```markdown
# Eisenhower Matrix

**Source:** Eisenhower (1954 speech). Kennedy (2022), *The Illusion of Urgency*. Patzak et al. (2025), *Boosting productivity and wellbeing through time management*, Frontiers in Education.

**Measures:** Urgency vs. importance — separates genuinely critical work from work that merely feels urgent.

**When to use:** Sanity-check for tasks that "feel" urgent. Catches priority inversion — urgent but unimportant tasks crowding out important but non-urgent ones.

**When not to use:** Tasks with identical urgency and importance profile — no discriminating power.

---

## Inputs (score each 1–5)

| Input | Description | 1 | 5 |
|-------|-------------|---|---|
| **Urgency (U)** | Must this be done now? Is delay costly or irreversible? | Can wait months | Must be done today |
| **Importance (I)** | Does this contribute meaningfully to goals and long-term outcomes? | No impact | Directly drives key goals |

In `--fast` mode: determine quadrant only (see quadrant table below).

---

## Quadrant reference

| Urgency | Importance | Quadrant | Meaning | Fast score |
|---------|------------|----------|---------|-----------|
| High (4–5) | High (4–5) | Q1: Do First | Crisis, deadline, key goal | 90 |
| Low (1–3)  | High (4–5) | Q2: Schedule | Strategic, high-value, plan it | 70 |
| High (4–5) | Low (1–3)  | Q3: Delegate | Interruption, someone else's priority | 30 |
| Low (1–3)  | Low (1–3)  | Q4: Eliminate | Busy work, low value | 10 |

## Formula

```
Eisenhower_score = (I × 0.70 + U × 0.30) × 20
```

Importance weighted 70% — the core Eisenhower insight: importance drives long-term outcomes; urgency is often an illusion.

Range: min = (1×0.7 + 1×0.3) × 20 = 20 · max = (5×0.7 + 5×0.3) × 20 = 100

No further normalization needed — output is already 0–100.

---

## Example

Task: Respond to a Slack message asking for a status update on a low-priority internal tool.
- U = 4 (message is sitting there, feels urgent)
- I = 1 (low-priority tool, no goal alignment)
→ Q3: Delegate/defer

```
Eisenhower_score = (1 × 0.70 + 4 × 0.30) × 20 = (0.70 + 1.20) × 20 = 38 → 38/100
```

The score correctly reflects: urgent-feeling but low-importance work.
```

- [ ] **Step 6.4: Verify all three files**

Each must have: Source citations, Measures, When to use/not use, Inputs table with anchors, Formula, Normalization or fast-mode equivalent, Example with numbers.

- [ ] **Step 6.5: Commit**

```bash
git add strict-labs/skills/strict-impact/references/method-cod.md
git add strict-labs/skills/strict-impact/references/method-bcr.md
git add strict-labs/skills/strict-impact/references/method-eisenhower.md
git commit -m "feat(strict-labs): add CoD, BCR, and Eisenhower scoring method references"
```

---

## Task 7: strict-impact SKILL.md

**Files:**
- Create: `strict-labs/skills/strict-impact/SKILL.md`

- [ ] **Step 7.1: Write strict-impact SKILL.md**

Create `strict-labs/skills/strict-impact/SKILL.md`:

```markdown
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
```

- [ ] **Step 7.2: Verify**

Confirm SKILL.md has: valid frontmatter, Invocation with all flags, Rules for each flag, Data source order, Routing decision tree, AUTO mode steps 1-10, fast/rescore/list mode descriptions, Low score behaviour, Output Format with actual example, reference to `references/` pattern.

- [ ] **Step 7.3: Commit**

```bash
git add strict-labs/skills/strict-impact/SKILL.md
git commit -m "feat(strict-labs): add strict-impact skill"
```

---

## Task 8: Plugin registration

**Files:**
- Modify: `strict-labs/.claude-plugin/plugin.json`

- [ ] **Step 8.1: Read current plugin.json**

Read `strict-labs/.claude-plugin/plugin.json` to check current skills list.

- [ ] **Step 8.2: Update plugin.json**

Add `strict-goals` and `strict-impact` to the skills list. The file currently has no skills registered. Update it so it declares both new skills:

```json
{
  "name": "strict-labs",
  "version": "0.1.0",
  "description": "Experimental and unstable content — early skills under development, draft hooks, and ideas being evaluated before promotion into stable packages.",
  "author": {
    "name": "Viperwow",
    "email": "viperkodiak@gmail.com"
  },
  "keywords": ["labs", "experimental", "draft", "unstable", "wip"],
  "skills": [
    {
      "name": "strict-goals",
      "path": "skills/strict-goals"
    },
    {
      "name": "strict-impact",
      "path": "skills/strict-impact"
    }
  ]
}
```

- [ ] **Step 8.3: Check marketplace.json**

Look for a `marketplace.json` at the repo root or in `.claude-plugin/`. If it lists plugins and `strict-labs` is not present, add it. If `strict-labs` is already listed, verify it is not incorrectly set to have no skills.

Per CLAUDE.md: "After adding or removing skills in any plugin, sync `marketplace.json` (add plugin if it now has skills and is not yet listed)."

- [ ] **Step 8.4: Verify plugin.json is valid JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('strict-labs/.claude-plugin/plugin.json','utf8')); console.log('valid')"
```

Expected output: `valid`

- [ ] **Step 8.5: Commit**

```bash
git add strict-labs/.claude-plugin/plugin.json
git commit -m "feat(strict-labs): register strict-goals and strict-impact in plugin"
```

---

## Self-review

**Spec coverage:**

| Spec requirement | Task |
|-----------------|------|
| strict-goals skill with invocation flags | Task 2 |
| goals-format.md with YAML format + 6 weights | Task 1 |
| --setup interactive 5-question flow | Task 2 |
| --review / --review-goals / --review-weights | Task 2 |
| Weekly review cadence (7-day stale check) | Task 2 |
| strict-impact skill with all flags | Task 7 |
| scoring-output.md with format + thresholds + merge rules | Task 3 |
| WSJF method with formula + normalization | Task 4 |
| ICE method | Task 4 |
| RICE method | Task 5 |
| ELR method | Task 5 |
| CoD method | Task 6 |
| BCR method | Task 6 |
| Eisenhower method | Task 6 |
| 5 severity tiers (Critical/High/Medium/Low/Skip) | Task 3, Task 7 |
| Low score behaviour + alternative suggestions | Task 7 |
| --fast mode with default ICE+WSJF | Task 7 |
| --rescore with merge logic | Task 7, Task 3 |
| --list mode | Task 7 |
| Session context first, then file, then ask | Task 2, Task 7 |
| Skills independent (no cross-references) | All tasks |
| references/ subdirectory convention | Tasks 1, 3, 4, 5, 6 |
| Plugin registration | Task 8 |
| Business justification output block | Task 7 |
| Goal alignment block | Task 7 |

**Placeholder scan:** None found — all steps contain complete file content.

**Type consistency:** Method IDs (`wsjf`, `ice`, `rice`, `elr`, `cod`, `bcr`, `eisenhower`) are consistent across scoring-output.md, strict-impact SKILL.md, and all method files.
