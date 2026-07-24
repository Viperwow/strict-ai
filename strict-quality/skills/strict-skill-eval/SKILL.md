---
name: strict-skill-eval
description: Use when defining or running deterministic quality gates for agentic skills or subagents — golden cases, first-attempt grading, executor/grader separation, CI checks before shipping a skill change. Triggers on /strict-skill-eval, skill QA, agent eval, golden test, AEVAL-style verification.
---

# strict-skill-eval

Replace anecdotal “demo looked fine” skill QA with a written, checkable evaluation contract. Prefer first-attempt correctness over self-correct-then-pass.

## When to use

- Before merging a change to any `SKILL.md` or agent `.md`
- When `strict-agents-creator` produces a golden case and you need a run protocol
- When a marketplace skill needs a CI-shaped quality signal

## Protocol

1. **Declare the contract** — point to existing cases under `.claude/agent-evals/<name>/` or write ≥1 new case using the format in `strict-agents-creator` → `references/eval-golden-cases.md`.
2. **Separate roles** — one run is the *executor* (agent/skill under test). A different context is the *grader* (asserts on final state + tool calls). Never let the executor grade itself.
3. **First-attempt grading** — grade the trajectory before silent self-fixes. If a later edit was required for the assertion to pass, record `self_corrected: true` and fail the correctness gate for that assertion.
4. **Emit a structured signal** — fill `references/result-template.md`. Binary correctness is the only ship gate. Efficiency (tools/tokens/time) is recorded, never gating.
5. **Act on fail** — do not ship; either fix the skill/agent or narrow the case if it was a fluke (prefer pruning weak cases over lowering the bar).

## Rules

- Checkable assertions only (files, fields, required/forbidden tools). No prose-only judgment as the gate.
- Executor and grader stay structurally separate.
- First attempt is the graded attempt; track self-correction explicitly.
- One high-signal critical-path case beats a pile of flaky demos.
- Do not invent a full harness in this skill — define and apply the protocol; wire CI later if needed.

## References

- `references/result-template.md` — output shape for a graded run
- Sibling: `strict-agents` → `strict-agents-creator` → `references/eval-golden-cases.md`
- Research basis: AEVAL (arXiv:2607.16345) — deterministic skill testing with executor/grader separation and first-attempt grading
