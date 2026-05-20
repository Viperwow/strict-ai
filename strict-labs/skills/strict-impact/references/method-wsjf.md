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
