# ICE Score

**Source:** Sean Ellis, GrowthHackers (2015). Widely used in product growth and prioritization.

**Measures:** Quick triage priority — impact of doing it, confidence in the estimate, ease of execution.

**When to use:** Fast initial filtering. Best for `--fast` mode and pre-scoring alternatives.

**When not to use:** When effort estimation matters significantly — ICE treats ease as binary.

---

## Inputs (score each 1–5)

| Input | Description | 1 | 5 |
|-------|-------------|---|---|
| **Impact (I)** | Value delivered if it works | Negligible | Game-changing |
| **Confidence (C)** | Certainty that impact estimate is accurate | Guessing | Evidence-backed |
| **Ease (E)** | How easy to implement | Months, complex | Hours, trivial |

In `--fast` mode: this is the primary method. Gut-estimate all three.

---

## Formula

```
ICE_raw = I × C × E
```

Range: min = 1×1×1 = 1 · max = 5×5×5 = 125

## Normalization to 0–100

```
ICE_score = (I × C × E - 1) / 124 × 100
```

Round to nearest integer.

---

## Example

Task: Add dark mode toggle.
- I = 2 (nice-to-have, won't move business metrics)
- C = 4 (confident it's wanted, user requests exist)
- E = 3 (moderate — CSS work, no backend changes)

```
ICE_raw = 2 × 4 × 3 = 24
ICE_score = (24 - 1) / 124 × 100 = 18.5 → 19/100
```
