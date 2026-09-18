# Metrics

## Encounter (external)

Per pattern, over **total sources** for this run (irrelevant sources excluded from total):

```
mention_rate  = (positive + negative + neutral) / total_sources
positive_rate = positive / total_sources
negative_rate = negative / total_sources
neutral_rate  = neutral / total_sources
```

Display: `mention 38% (18/47) · positive 28% · negative 4% · neutral 6%`

If `total_sources < sample-min` (default 10): `Rates omitted: sample below minimum (N={n}).`

## Encounter (internal)

Single frequency over **total artifacts**:

`Encounter (internal): 12% (3/25)`

## Trends

`Popularity` and `Internal adoption` — one trend label each. Values and assignment: [temporal-trends.md](https://github.com/Viperwow/strict-ai/blob/main/strict-knowledge/skills/strict-best-practices/references/temporal-trends.md).

## Alignment

One kebab-case label + **Basis** (human-readable justification for the two trend choices, with numbers). No `(34/100)` scores.

| Label | When |
|---|---|
| aligned | same trend on both lines |
| misaligned | different trends, not covered below |
| leading | internal trend is newer than external |
| divergent | `uptrend` vs `downtrend` |
| external-only | pattern in external sample only |
| local-only | pattern in internal sample only |
| insufficient-data | not enough data to compare |

Basis required except `insufficient-data` when comparison is impossible.

Example:

```markdown
**Popularity:** stable
**Internal adoption:** hot

**Alignment:** leading
*Basis:* About 65% of external mentions fall in stable-range sources (1Y–2Y), but 80% of internal matches are in artifacts younger than three months.
```

- **Default:** one sentence, **≤ 30 words**.
- **`--verbose`:** up to two sentences; may cite per-bucket shares.

## Regional

Global block always first. Regional block only with `--region` or explicit regional context.

`vs global`: percentage-point difference vs the global pattern above (encounter or key bucket share).

## Pattern card order

1. Description (≤ 30 words)
2. Encounter (external), Encounter (internal)
3. Popularity, Internal adoption
4. Alignment + Basis
5. External sources, Internal sources

Sort patterns by external mention rate descending.

Sources: top 5 per list, then `+N more in sample`. `--verbose`: all sources.

Internal absence per pattern: `No Internal sources found.`
