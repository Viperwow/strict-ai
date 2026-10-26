# Temporal trends

Log-scale buckets: `1W → 1M → 3M → 6M → 1Y → 2Y → 3Y → 5Y`.

## Trend labels

One label per pattern per scale (`**Popularity:**` external, `**Internal adoption:**` internal):

| Label | Buckets | Meaning |
|---|---|---|
| hot | 1W, 1M | newest mentions, or direction unclear on the short interval |
| uptrend | 3M, 6M | medium-fresh; share in recent buckets **rising** |
| downtrend | 3M, 6M | medium-fresh; share in recent buckets **falling** |
| stable | 1Y, 2Y | established practice; flat or quiet — no separate “established” label |
| legacy | 3Y, 5Y | long tail; sunset or historical practice |
| unknown | — | too few data points |

Output:

```markdown
**Popularity:** stable
**Internal adoption:** uptrend
```

No parentheses — one trend word per line.

### Assignment (apply in order)

1. `unknown` — sample too small for temporal buckets.
2. `legacy` — mass concentrates in 3Y–5Y.
3. `stable` — mass concentrates in 1Y–2Y (quiet stable stays **stable**; a revival surfaces as fresh sources in hotter buckets).
4. `uptrend` — 3M–6M dominates and recent-bucket share is rising.
5. `downtrend` — 3M–6M dominates and recent-bucket share is falling.
6. `hot` — 1W–1M dominates, or direction is unclear on the short interval.

Do not downgrade quiet **stable** to **downtrend**. Active decline belongs in medium-fresh buckets only.

## External scale

Full bucket range. Source `timestamp` (UTC) sets bucket placement.

- `fundamental` sources (RFC, specs, books): map toward **stable** when globally recognized.
- `date: unknown` — counts toward mentions if relevant; excluded from trend buckets.

## Internal scale (project-age adjusted)

| Project age | Available buckets |
|---|---|
| < 1 month | 1W, 1M |
| 1–6 months | through 6M |
| 6–24 months | through 1Y–2Y |
| > 2 years | full scale through 5Y |

Unavailable bucket: `{bucket}: n/a (project age)`.

Signals: artifact timestamps first; `@deprecated`, `legacy/` paths, `old` markers as hints, not area boundaries.

## Alignment (Popularity vs Internal adoption)

| Rule | Label |
|---|---|
| Same trend on both lines | `aligned` |
| `uptrend` vs `downtrend` (either order) | `divergent` |
| Internal trend is newer than external (`hot`/`uptrend` vs `stable`/`legacy`) | `leading` |
| Other mismatch | `misaligned` |
| Either line is `unknown` | `insufficient-data` |

**Basis** — human-readable justification for the two trend labels, with numbers (see [metrics.md](https://github.com/Viperwow/strict-ai/blob/main/strict-knowledge/skills/strict-best-practices/references/metrics.md)).

## Verbose mode

Default: trend label only. `--verbose`: per-bucket mention shares, then trend label.
