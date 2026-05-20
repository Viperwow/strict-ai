# RICE Score

**Source:** Intercom (2016). *RICE: Simple prioritization for product managers.*

**Measures:** Scope-adjusted impact — how many people are affected, by how much, with what confidence, relative to effort.

**When to use:** When user reach and effort are meaningfully different across tasks.

**When not to use:** Internal tooling or infra tasks where "reach" is not applicable.

---

## Inputs (score each 1–5)

| Input | Description | 1 | 5 |
|-------|-------------|---|---|
| **Reach (R)** | Number of users or stakeholders impacted | 1 person | All users |
| **Impact (I)** | Magnitude of effect per user | Trivial improvement | Massive improvement |
| **Confidence (C)** | Certainty in reach and impact estimates | Wild guess | Data-backed |
| **Effort (E)** | Total work required (inverse — less effort = higher score) | Months | Hours |

In `--fast` mode: estimate each in under 30 seconds.

---

## Formula

```
RICE_raw = (R × I × C) / E
```

Range: min = (1×1×1)/5 = 0.2 · max = (5×5×5)/1 = 125.0

## Normalization to 0–100

```
RICE_score = (RICE_raw - 0.2) / (125.0 - 0.2) × 100
           = (RICE_raw - 0.2) / 124.8 × 100
```

Round to nearest integer.

---

## Example

Task: Improve search result ranking algorithm.
- R = 4 (70% of users use search regularly)
- I = 3 (noticeable improvement in task success rate)
- C = 3 (some A/B data, not conclusive)
- E = 4 (significant ML work)

```
RICE_raw = (4 × 3 × 3) / 4 = 9.0
RICE_score = (9.0 - 0.2) / 124.8 × 100 = 7.05 → 7/100
```
