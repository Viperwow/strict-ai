# strict-risk — final report format

Produce these sections **in this order**:

## Target event

Define exactly what probability is being estimated.

## Object and exposure

Identify the exact object/activity, location, date if relevant, model/manufacturer when available, age, and exposure unit.

## Current red flags

List any verified current issue that materially changes the baseline risk. If none were found, say **"No verified current red flag found in the sources reviewed."** This means only that none was found, not that none exists.

## Object-specific evidence

List known relevant incidents, operating history, inspection information, maintenance information, recalls, closures, or other direct evidence.

## Reference-class evidence

Present the best broader dataset that can inform the estimate.

## Denominator

State the known denominator or show how a denominator range was estimated. If unavailable, say so clearly.

## Model

State the statistical or reliability model used and why.

## Calculation

Show the reproducible calculation: assumptions, formulas, inputs, and results. Do not expose hidden chain-of-thought; provide enough mathematics that another quantitatively trained person could reproduce or challenge the estimate.

## Estimated risk

Give the best estimate, range, upper bound, or state that the probability cannot be responsibly identified.

## Aging and non-stationarity

Explain whether aging, wear, maintenance, component replacement, or changing hazard materially affects interpretation.

## Human and organizational failure

Explain relevant operator-error pathways and independent safeguards if evidence is available.

## Uncertainty and sensitivity

State the biggest uncertainties and how much reasonable alternative assumptions change the result.

## Risk comparisons

Provide only mathematically defensible comparisons, or say that no useful comparison was found.

## Evidence quality

Give the A–E grade and explanation. See [evidence-grades.md](https://github.com/Viperwow/strict-ai/blob/main/strict-labs/skills/strict-risk/references/evidence-grades.md).

## Bottom line

State the quantitative conclusion without reassurance language. Use wording such as:

- "Best supported order of magnitude: …"
- "95% conservative upper bound under assumptions X, Y, Z: …"
- "Public data are insufficient to identify the absolute probability, but they support the following bound/range: …"
- "A verified current red flag materially changes the baseline estimate."

## Sources

Numbered list of direct URLs. For each URL, one sentence stating what fact or dataset it supports.
