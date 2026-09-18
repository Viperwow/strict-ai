# Temporal phases

Log-scale buckets: `1W → 1M → 3M → 6M → 1Y → 2Y → 3Y → 5Y`.

## Phase labels (both scales)

One per pattern per scale — where mention mass concentrates:

| Label | Buckets | Meaning |
|---|---|---|
| hot | 1W, 1M | newest mentions |
| trending | 3M, 6M | medium-fresh practice |
| stable | 1Y, 2Y | established; global classics (RFC, books) |
| legacy | 3Y, 5Y | long tail; sunset or historical practice |

Output format:

```markdown
**Popularity:** trending (**growing**)
**Internal adoption:** hot (**emerging**)
```

Phase label in plain text; verdict in bold inside parentheses.

Internal buckets may be unavailable for young projects — phase is computed only over available buckets.

## Verdict (parentheses)

One word from: `emerging` | `growing` | `established` | `declining` | `unknown`.

Same set for **Popularity** and **Internal adoption**. Describes mention **dynamics** across buckets — independent of the phase label.

| Verdict | Meaning |
|---|---|
| `emerging` | pattern just appeared; direction not yet clear |
| `growing` | rising share in hot/trending buckets |
| `established` | stable mass in stable-phase buckets |
| `declining` | falling share in recent buckets |
| `unknown` | too few data points for a trend |

Phase and verdict must not duplicate the same idea (e.g. no `legacy` verdict — use phase `legacy` with verdict `declining` or `established`).

## Phase × verdict (typical pairings)

| Phase ↓ / Verdict → | emerging | growing | established | declining | unknown |
|---|---|---|---|---|---|
| **hot** | ● | ● | △ | △ | ● |
| **trending** | ○ | ● | ○ | ○ | ● |
| **stable** | △ | ○ | ● | ○ | ● |
| **legacy** | △ | △ | ○ | ● | ● |

● typical · ○ possible · △ rare

## External scale

Full bucket range. Source `timestamp` (UTC) determines bucket placement.

- `fundamental` sources (RFC, specs, books): map to **stable** when globally recognized.
- `trend` sources: bucket by timestamp.

`date: unknown` on a source — counts toward encounter if relevant; excluded from temporal buckets.

## Internal scale (project-age adjusted)

| Project age | Available buckets |
|---|---|
| < 1 month | 1W, 1M |
| 1–6 months | through 6M |
| 6–24 months | through 1Y–2Y |
| > 2 years | full scale through 5Y |

Unavailable bucket: `{bucket}: n/a (project age)`.

Signals: artifact timestamps first; `@deprecated`, `legacy/` paths, `old` markers as hints, not area boundaries.

## Verbose mode

Default: phase + verdict only. `--verbose`: per-bucket mention shares for external and internal, then phase + verdict.
