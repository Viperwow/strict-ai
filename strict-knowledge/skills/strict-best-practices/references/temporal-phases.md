# Temporal phases

Log-scale buckets: `1W → 1M → 3M → 6M → 1Y → 2Y → 3Y → 5Y`.

## Phase assignment (one per pattern per scale)

Assign the phase where mention mass concentrates:

| Phase | Buckets | Meaning |
|---|---|---|
| hot | 1W, 1M | newest mentions |
| trending | 3M, 6M | medium-fresh practice |
| stable | 1Y, 2Y | established; global classics (RFC, books) |
| heritage | 3Y, 5Y | long tail |

Output format:

```markdown
**Popularity:** trending (**growing**)
**Internal adoption:** hot (**emerging**)
```

Phase label in plain text; verdict in bold inside parentheses.

## Phase labels (both scales)

One per pattern per scale — where mention mass concentrates:

| Label | External (Popularity) | Internal (Internal adoption) |
|---|---|---|
| `hot` | 1W, 1M | 1W, 1M (if project age allows) |
| `trending` | 3M, 6M | 3M, 6M |
| `stable` | 1Y, 2Y | 1Y, 2Y |
| `heritage` | 3Y, 5Y | 3Y, 5Y |

Internal buckets may be unavailable for young projects — phase is computed only over available buckets.

## Verdict (parentheses)

One word from: `emerging` | `growing` | `established` | `declining` | `legacy` | `unknown`.

Same set for **Popularity** and **Internal adoption**. Describes mention **dynamics** across buckets, not the phase label alone.

| Verdict | Typical signal |
|---|---|
| `emerging` | new mass appearing in the newest buckets |
| `growing` | rising share in hot/trending buckets |
| `established` | stable mass in stable phase buckets |
| `declining` | falling share in recent buckets |
| `legacy` | mass shifting toward heritage |
| `unknown` | too few data points for a trend |

## External scale

Full bucket range. Source `timestamp` (UTC) determines bucket placement.

- `fundamental` sources (RFC, specs, books): map to **stable** when globally recognized.
- `trend` sources: bucket by timestamp; trending phase = medium-fresh (3M–6M) industry practice.

`date: unknown` on a source — counts toward encounter if relevant; excluded from temporal buckets.

## Internal scale (project-age adjusted)

| Project age | Available buckets |
|---|---|
| < 1 month | 1W, 1M |
| 1–6 months | through 6M |
| 6–24 months | through 1Y–2Y |
| > 2 years | full scale through 5Y |

Unavailable bucket: `{bucket}: n/a (project age)`.

Signals: artifact timestamps first; `@deprecated`, `legacy`, `old` as hints, not area boundaries.

## Verbose mode

Default: phase + verdict only. `--verbose`: per-bucket mention shares for external and internal, then phase + verdict.
