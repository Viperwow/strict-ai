# strict-decision — final report format

Produce these sections **in this order**:

## Decision question

State the action and alternative.

## Decision policy

State the exact threshold, utility rule, or constraint being applied. If the threshold was inferred rather than explicitly provided, label it **INFERRED**.

## Risk input

State the point estimate, interval, conservative bound, evidence quality, and exposure unit.

## Current red flags

State whether any verified current issue overrides or materially changes the baseline decision.

## Threshold comparison

Show the numerical comparison explicitly. Example:

- 95% upper bound = 4 × 10⁻⁷ per ride
- Threshold = 1 × 10⁻⁶ per ride
- Ratio = 0.40
- Therefore the bound is 2.5 times below the threshold.

## Sensitivity

State what changes in assumptions would reverse the decision.

## Evidence sufficiency

State whether available evidence is sufficient under the policy.

## Value of additional information

State whether more research is likely to change the decision. If yes, specify exactly which missing information is worth obtaining. If no, state **STOP RESEARCH**.

## Verdict

Return exactly one primary verdict:

- **ACCEPT**
- **REJECT**
- **INSUFFICIENT INFORMATION**

Then append one robustness label when applicable:

- **ROBUST**
- **MARGINAL**

Examples: `ACCEPT — ROBUST`, `ACCEPT — MARGINAL`, `REJECT — ROBUST`, `REJECT — MARGINAL`, `INSUFFICIENT INFORMATION`.

## Reason

Short mathematical explanation of why the policy produces that verdict.

## Action rule

State what factual change, if any, should cause the decision to be reopened.
