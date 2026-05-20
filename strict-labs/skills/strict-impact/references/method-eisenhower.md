# Eisenhower Matrix

**Source:** Eisenhower (1954 speech). Kennedy (2022), *The Illusion of Urgency*. Patzak et al. (2025), *Boosting productivity and wellbeing through time management*, Frontiers in Education.

**Measures:** Urgency vs. importance — separates genuinely critical work from work that merely feels urgent.

**When to use:** Sanity-check for tasks that "feel" urgent. Catches priority inversion — urgent but unimportant tasks crowding out important but non-urgent ones.

**When not to use:** Tasks with identical urgency and importance profile — no discriminating power.

---

## Inputs (score each 1–5)

| Input | Description | 1 | 5 |
|-------|-------------|---|---|
| **Urgency (U)** | Must this be done now? Is delay costly or irreversible? | Can wait months | Must be done today |
| **Importance (I)** | Does this contribute meaningfully to goals and long-term outcomes? | No impact | Directly drives key goals |

In `--fast` mode: determine quadrant only (see quadrant table below).

---

## Quadrant reference

| Urgency | Importance | Quadrant | Meaning | Fast score |
|---------|------------|----------|---------|-----------|
| High (4–5) | High (4–5) | Q1: Do First | Crisis, deadline, key goal | 90 |
| Low (1–3)  | High (4–5) | Q2: Schedule | Strategic, high-value, plan it | 70 |
| High (4–5) | Low (1–3)  | Q3: Delegate | Interruption, someone else's priority | 30 |
| Low (1–3)  | Low (1–3)  | Q4: Eliminate | Busy work, low value | 10 |

## Formula

```
Eisenhower_score = (I × 0.70 + U × 0.30) × 20
```

Importance weighted 70% — the core Eisenhower insight: importance drives long-term outcomes; urgency is often an illusion.

Range: min = (1×0.7 + 1×0.3) × 20 = 20 · max = (5×0.7 + 5×0.3) × 20 = 100

No further normalization needed — output is already 0–100.

---

## Example

Task: Respond to a Slack message asking for a status update on a low-priority internal tool.
- U = 4 (message is sitting there, feels urgent)
- I = 1 (low-priority tool, no goal alignment)
→ Q3: Delegate/defer

```
Eisenhower_score = (1 × 0.70 + 4 × 0.30) × 20 = (0.70 + 1.20) × 20 = 38 → 38/100
```

The score correctly reflects: urgent-feeling but low-importance work.
