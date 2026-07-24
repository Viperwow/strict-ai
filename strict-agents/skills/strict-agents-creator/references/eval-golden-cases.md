# Golden eval cases

Every generated agent ships with at least one golden case. Frame is **floor-raising** (see <https://www.howtoeval.com>): the case defines a critical path the agent must always get right. If the agent fails a golden case, it does not ship.

## Two layers — keep them separate

- **Correctness gate (this file).** Binary. Deterministic assertions on the agent's final state + required/forbidden tool calls. Blocks shipping.
- **Efficiency metrics.** Tool-call count, tokens, time. Recorded and compared before/after. **Never a gate.** An agent that passes correctness but got slower is still correct.

Mixing efficiency into the gate corrupts both signals. Do not add token/time thresholds as pass/fail.

## What makes a good case

- **Critical path only.** The most common input the agent must always handle. Start with one; grow to 5–10 as real failures appear.
- **Checkable.** Assert on structure that code can verify — final state, a field value, files changed, tool calls made or avoided. Prefer this over judging prose.
- **Representative, not one-off.** Before adding a case ask: is this a critical path? Could it regress? Is it a class of failure or a fluke? "20 high-signal cases beat 200 low-signal ones." Prune cases that have not failed in months.

## Case file format

Written to `.claude/agent-evals/<name>/case-01.md` (or the `~/.claude` equivalent) — see `references/output-contract.md`:

```markdown
# Case 01 — <short name>

## Input
<Exact input handed to the agent.>

## Expected final state
- <Checkable assertion on the result / artifact.>

## Required tool calls
- <Tool that MUST be called, e.g. Read on the target file.>

## Forbidden tool calls
- <Tool that must NOT be called, e.g. Bash rm, any external send.>
```

## First-attempt grading (required when a run exists)

Grade the *first* attempt in the trajectory, not the final self-repaired state.

- If the agent only satisfies an assertion after a silent self-corrective edit in the same run, mark that assertion **FAIL** and set `self_corrected: true`.
- Track self-correction explicitly; do not treat “eventually fixed” as a pass.
- Keep efficiency (tools / tokens / time) out of the pass/fail gate.

This matches the AEVAL first-attempt rule for agentic skill workflows (arXiv:2607.16345): anecdotal demo-watching and self-grading inflate pass rates.

## Executor / grader separation

- **Executor** — the agent or skill under test. Produces a trajectory and artifacts.
- **Grader** — a separate context or harness that asserts on final state + tool calls.

Never let the executor grade itself. For a manual run protocol and result template, use `strict-quality` → `strict-skill-eval`.

## What the case is, and is not

Write it so a machine *could* check it: a final-state assertion plus required and forbidden tool calls, with no prose judgment needed.

Be clear-eyed about what ships, though. This skill produces the contract, not a runner. Nothing here executes the case or blocks anything on its own — you check it by hand, via `strict-skill-eval`, or you point a harness you supply at it. The value is that "correct" stops being an opinion and becomes something written down before the agent runs, in a shape a runner can consume later.
