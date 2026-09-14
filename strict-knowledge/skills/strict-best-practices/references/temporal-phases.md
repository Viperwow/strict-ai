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

Output: `**External phase:** trending → **growing**` (phase + verdict).

## Verdict

One word from: `emerging` | `growing` | `established` | `declining` | `legacy` | `unknown`.

Derive from mention dynamics across available buckets — heavier recent mass → `emerging`/`growing`; stable mass in 1Y–2Y → `established`; rising heritage share → `declining`/`legacy`.

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
