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
