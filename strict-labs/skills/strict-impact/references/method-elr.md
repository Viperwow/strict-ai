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
