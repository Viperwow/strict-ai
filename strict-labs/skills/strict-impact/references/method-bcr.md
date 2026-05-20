# BCR — Benefit/Cost Ratio

**Source:** Classic decision analysis. Aeon, Faber & Panaccio (2021), *Does time management work? A meta-analysis*, PLOS ONE. Bedi & Sass (2023), *A meta-analytic review*, Journal of Social Psychology.

**Measures:** Whether a task delivers more value than it costs. Identifies waste and low-ROI work.

**When to use:** When effort cost varies significantly across options. Good for comparing refactoring vs. feature work.

**When not to use:** When all tasks have similar cost — BCR loses discriminating power.

---

## Inputs (score each 1–5)

**Benefit inputs:**

| Input | Description | 1 | 5 |
|-------|-------------|---|---|
| **Business Impact (BI)** | Value to the business | None | Critical |
| **User Impact (UI)** | Value to end users | None | Essential |
| **Risk Reduction (RR)** | Defect or incident prevention | None | Eliminates major risk |

**Cost inputs:**

| Input | Description | 1 | 5 |
|-------|-------------|---|---|
| **Time Cost (TC)** | Implementation time | < 1 hour | > 1 week |
| **Complexity (CX)** | Technical complexity | Trivial | Highly complex |
| **Cognitive Load (CL)** | Mental overhead, coordination | Solo, obvious | Cross-team, ambiguous |

In `--fast` mode: estimate totals, not individual dimensions.

---

## Formula

```
Benefit = BI + UI + RR          (range: 3–15)
Cost    = TC + CX + CL          (range: 3–15)
BCR_raw = Benefit / Cost
```

Range: min = 3/15 = 0.2 · max = 15/3 = 5.0

## Normalization to 0–100

```
BCR_score = (Benefit/Cost - 0.2) / (5.0 - 0.2) × 100
           = (Benefit/Cost - 0.2) / 4.8 × 100
```

Round to nearest integer.

---

## Example

Task: Update a single UI label (copy change).
- BI=1, UI=2, RR=1 → Benefit = 4
- TC=1, CX=1, CL=1 → Cost = 3

```
BCR_raw = 4 / 3 = 1.33
BCR_score = (1.33 - 0.2) / 4.8 × 100 = 23.5 → 24/100
```
