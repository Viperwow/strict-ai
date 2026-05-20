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
