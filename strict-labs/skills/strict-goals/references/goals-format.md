# Goals File Format

The goals file stores personal, team, and company goals alongside the scoring weights used by strict-impact to evaluate task priority.

## Location

User home directory: `~/.strict-ai/goals.md`

The file is created and maintained by strict-goals. Any skill or agent that needs
goal context reads it as a standard file source — no special coupling required.

## Creation

The goals file is created by strict-goals via `--setup` or `--review`.

**Minimum required on creation:**
- At least one goal in any category (personal, team, or company)
- All six weight keys present (missing keys default to 3 during parsing, but all should be explicitly set on creation)

## Format

~~~yaml
---
updated: YYYY-MM-DD
---

goals:
  personal:
    - "Ship the new onboarding flow by end of Q3"        # 1–3 action-oriented goal statements
  team:
    - "Reduce P1 incident response time to under 30 minutes"
  company:
    - "Grow monthly active users by 15% this quarter"

weights:
  business_impact: 5    # 1–5; how much business value matters
  user_impact: 4        # 1–5; how much end-user benefit matters
  risk_reduction: 4     # 1–5; how much risk mitigation matters
  strategic_alignment: 3  # 1–5; how much OKR/goal alignment matters
  urgency: 3            # 1–5; how much time-sensitivity matters
  effort_cost: 3        # 1–5; how much implementation cost matters
~~~

## Rules

- `updated` is ISO 8601 date (YYYY-MM-DD). If missing or malformed, treat the file as stale.
- The file is considered stale when `updated` age ≥ 7 days. Staleness triggers a warning only — the file remains usable.
- Each goal entry: one sentence, action-oriented ("Deliver X by Q3"). No max length enforced, but keep each to one sentence.
- Empty goals arrays are valid but the skill will prompt the user to populate them.
- All six weight keys are required. If a key is missing despite that requirement, parsing defaults to 3 for the missing key.
- Weights are integers 1–5 only (floats are not accepted). Higher values mean the criterion contributes more to the composite score.
- Goals are qualitative context; weights are quantitative inputs to scoring.
