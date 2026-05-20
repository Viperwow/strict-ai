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
