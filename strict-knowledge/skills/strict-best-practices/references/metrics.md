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

## Alignment

One kebab-case label + **Basis** with human-readable numbers. No `(34/100)` scores.

| Label | When |
|---|---|
| aligned | internal and external trends move the same way |
| misaligned | trends move in different directions |
| local-only | pattern in internal sample only |
| external-only | pattern in external sample only |
| insufficient-data | not enough data to compare |

Basis required except `insufficient-data` when comparison is impossible.

### Basis (prose)

Write **plain sentences**, not shorthand chains (`external mass in stable; internal <3M`).

- **Default:** one sentence, **≤ 30 words** — same organic cap as Description.
- **`--verbose`:** up to two sentences; may name per-bucket or per-phase shares.
- Weave numbers in naturally (`41% of external sources`, `most internal artifacts`).
- Name phases in readable terms (`established industry practice`, `recent project artifacts`) — not bare labels alone.

Example (default):

```markdown
**Alignment:** misaligned
*Basis:* About 65% of external mentions fall in the established phase, but 80% of internal matches are in artifacts younger than three months.
```

## Regional

Global block always first. Regional block only with `--region` or explicit regional context.

`vs global`: percentage-point difference vs the global pattern above (encounter or key phase share).

## Pattern card order

1. Description (≤ 30 words)
2. Encounter (external), Encounter (internal)
3. Popularity, Internal adoption (phase label + verdict in parentheses)
4. Alignment + Basis
5. External sources, Internal sources

Sort patterns by external mention rate descending.

Sources: top 5 per list, then `+N more in sample`. `--verbose`: all sources.

Internal absence per pattern: `No Internal sources found.`
