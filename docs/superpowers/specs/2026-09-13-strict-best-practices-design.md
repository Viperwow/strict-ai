# Design: strict-best-practices

**Date:** 2026-09-13  
**Status:** implemented  
**Placement:** `strict-knowledge/skills/strict-best-practices/SKILL.md`

## Problem

Agents jump straight to implementation without grounding in industry practice or project context. The user needs evidence — internal patterns and verifiable external sources — before ADR decisions, without the research skill authoring ADRs or recommending a single option.

## Goal

`strict-best-practices` performs full research and returns a structured chat block: pattern cards with descriptions, mention metrics, trends, alignment, and cited sources. Output enriches ADR work done by other skills or the user. No code changes, no decision recommendation.

## Role boundary

| In scope | Out of scope |
|---|---|
| Full external + internal research | Creating or writing ADR/PRD files |
| Verifiable quotes and links | Recommending which option to pick |
| Mentions, trend, alignment metrics | File-level implementation plans |
| Cache raw acquired data per best practice | Storing computed metrics or included/excluded state |
| Auto-invoke on system design (one-line notice) | Rollback / hardening ADR lifecycle |

Granularity: C4 Context → Container → Component.

## Invocation

```
/strict-best-practices [topic or scope]
/strict-best-practices --scope <c4-boundary> --region EU …
```

**Auto-invoke** when session context is system design (trade-offs, approach choice, draft ADR, C4 ≥ Container). Emit one line before starting:

```text
strict-best-practices: starting research (sample target 100)…
```

Override with explicit `/strict-best-practices` or contextual trigger only.

### CLI parameters

| Parameter | Default | Purpose |
|---|---|---|
| `--scope` | from context | C4 system boundary |
| `--since` | auto | lower bound for external source age |
| `--sample-min` | `10` | minimum total sources before rates |
| `--sample-target` | `100` | search target for external sample |
| `--region` | none | add regional block (e.g. `EU`, `CN`) |
| `--domain` | auto | knowledge domain hint |
| `--cache` | `on` | `on` \| `off` \| `refresh` |
| `--cache-ttl` | `30d` | cache entry lifetime |
| `--internal-only` | off | internal patterns only |
| `--external-only` | off | external practices only |
| `--verbose` | off | expanded bucket list and full source list |

Sane defaults; ask only when a required input is missing. No `--force-metrics`.

## Terminology

| Use | Avoid |
|---|---|
| sample, total sources, total artifacts | corpus |
| Internal patterns | repo patterns |
| No Internal sources found. | …in repository |
| Domain-appropriate terms | overloaded jargon |

Apply repository-wide rules in `CLAUDE.md` (skill output headers, absence phrases, cache, CLI shape).

## Research rules

### External sample

- Search toward `--sample-target` (default 100). Sources **irrelevant to the current scope** are excluded from **total sources** for this run's rates and listed at end of output — but their **raw acquired data is still cached** (same JSON contract) so a later invocation under a different scope can reuse them without re-fetching.
- Present **3–7** highest-relevance external sources per pattern in chat; `--verbose` shows all sources used for that pattern.
- Each external source: URL, author, **timestamp (UTC)**, verbatim quote, stance (`positive` \| `negative` \| `neutral`), type (`fundamental` \| `trend`).
- `fundamental`: RFC, specs, books, world-recognized references — age does not exclude from **stable**.
- `trend`: medium-fresh industry practice (log-scale horizons); world classics still map to **stable** when recognized globally.

### Internal sample

- Any project artifact (code, OpenAPI, CI, docs, design tokens, etc.).
- Prefer timestamps (created, modified, cluster metadata); `@deprecated`, `legacy`, `old` are signals, not full-area boundaries.
- Internal temporal scale compresses by **project age**; unavailable buckets use `n/a (project age)`.

### Rates

- Always show `count / total`, not percent alone.
- External mentions: `total`, `positive`, `negative`, `neutral` (total = sum of the three).
- Internal mentions: single `total` frequency only.
- If `total sources < sample-min`: `Rates omitted: sample below minimum (N={n}).` — per absence rules in `CLAUDE.md`.

## Temporal model

### Buckets (log scale)

`1W → 1M → 3M → 6M → 1Y → 2Y → 3Y → 5Y`

### Trends (one label per line)

| Label | Buckets | Meaning |
|---|---|---|
| **hot** | 1W, 1M | newest mentions, or direction unclear on the short interval |
| **uptrend** | 3M, 6M | medium-fresh; recent-bucket share rising |
| **downtrend** | 3M, 6M | medium-fresh; recent-bucket share falling |
| **stable** | 1Y, 2Y | established; quiet stable stays stable — revival appears in hotter buckets |
| **legacy** | 3Y, 5Y | long tail; sunset or historical practice |
| **unknown** | — | too few data points |

Assignment order: `unknown` → `legacy` → `stable` → `uptrend` / `downtrend` → `hot`. Do not map quiet **stable** to **downtrend**.

Example:

```markdown
**Popularity:** stable
**Internal adoption:** hot
```

`--verbose`: per-bucket mention shares plus trend label.

### Project-age adjustment (internal)

| Project age | Available buckets |
|---|---|
| < 1 month | 1W, 1M |
| 1–6 months | through 6M |
| 6–24 months | through 1Y–2Y |
| > 2 years | full scale through 5Y |

## Alignment

Single kebab-case label per pattern plus **Basis** — human-readable justification for the two trend labels, with numbers. No `(34/100)` scores.

| Value | Meaning |
|---|---|
| `aligned` | same trend on both lines |
| `misaligned` | different trends, not covered below |
| `leading` | internal trend is newer than external |
| `divergent` | `uptrend` vs `downtrend` |
| `local-only` | pattern in internal sample only |
| `external-only` | pattern in external sample only |
| `insufficient-data` | not enough data to compare |

Basis required except `insufficient-data` when comparison is impossible.

## Regional

- **Global (world)** block always first and mandatory.
- **Regional** block only when context or `--region` set; separate from global, never mixed.
- Show `vs global` as percentage-point difference with explicit reference to the global pattern above.
- Default scope is world market; regional divergence explains where regional practice differs from global.

## Output format

Chat header (repository default):

```markdown
## strict-best-practices output
```

### Metadata

```markdown
### Research metadata
- **Scope:** …
- **Sample:** total sources: 47 · total artifacts: 25
- **Sample target:** 100 · sample-min: 10
- **Temporal scale:** project-age-adjusted (project age: 4mo)
- **Research date:** 2026-09-13
```

### Pattern card (basic → derived)

Sort patterns by external total rate descending. Top 5 sources per list; then `+N more in sample` unless `--verbose`.

```markdown
### Pattern: Cursor-based pagination

**Description:** Key-based pagination for large lists; avoids offset cost at scale.

**Mentions (external):** total 38% (18/47) · positive 28% · negative 4% · neutral 6%
**Mentions (internal):** total 12% (3/25)

**Popularity:** stable
**Internal adoption:** hot

**Alignment:** leading
*Basis:* About 65% of external mentions fall in stable-range sources (1Y–2Y), but 80% of internal matches are in artifacts younger than three months.

**External sources:**
- [Title](url) — Author, 2025-03-12 — positive — "…"
- … +2 more in sample

**Internal sources:**
- `api/handlers/list.go` — "…"
```

When absent: `No Internal sources found.` on the internal sources line.

- **Description:** ≤ 30 words.
- Per-pattern internal absence: `No Internal sources found.` (repository absence phrase).

### Irrelevant list (end of output)

```markdown
### Excluded from sample (irrelevant to scope)
- OAuth2 token rotation in mobile SDKs
- GraphQL federation at scale
```

Labels only — no statistics in chat. Underlying **raw sources are cached** under a BP file (provisional `slug` from the label, same `external[]` / `internal[]` fields). On a later run, read cache first; promote cached sources into the active sample when the new scope makes them relevant.

### Verbose off (default)

- Trend labels only (not per-bucket).
- Top 5 sources per internal/external list.
- Short Basis.

### Verbose on

- Per-bucket mention shares for external and internal.
- All sources for each pattern.
- Expanded Basis; cache hit metadata when reads occurred.

## Cache

**Purpose:** store **raw acquired data** only — metrics recomputed on every run.

**Path:** `.strict-ai/cache/strict-best-practices/<bp-slug>-<short-id>.json`

**Default:** `--cache on`, TTL `30d`. Merge new raw entries by URL (external) or path + line range (internal). On `--cache refresh` or TTL expiry, re-fetch stale entries; recompute all metrics.

**Cache everything fetched** — including sources that are irrelevant to the **current** scope. Scope relevance is evaluated per run, not persisted.

**Cross-task reuse:** before external search, scan the cache directory. Use cached raw records when they match the new query; skip network fetch when TTL is valid.

**Do not cache:** mention rates, trends, alignment, or included/excluded **state**. Do not write the chat exclusion list as a separate artifact — only the underlying source records in BP JSON files.

### File contract

Filename joins slug and id; JSON `id` is **short-id only**.

```json
{
  "id": "a7f3",
  "slug": "cursor-pagination",
  "cachedAt": "2026-09-13T10:00:00Z",
  "external": [
    {
      "url": "https://example.com/post",
      "title": "Pagination at scale",
      "author": "Jane Doe",
      "timestamp": "2025-03-12T14:30:00Z",
      "quote": "Cursor pagination avoids OFFSET cost on large tables."
    }
  ],
  "internal": [
    {
      "path": "api/handlers/list.go",
      "startLine": 42,
      "endLine": 58,
      "quote": "return decodeCursor(r.URL.Query().Get(\"cursor\"))"
    }
  ]
}
```

**Atomicity:** one value per field — no combined `lines 42-58` strings; use `startLine` and `endLine`. Timestamps always UTC ISO 8601.

Optional internal fields when present: `section`, `startColumn`, `endColumn` — each in its own key.

## Absence phrases

Use repository-wide templates from `CLAUDE.md` § Absence phrases. Entities for this skill: `Sources`, `Patterns`, `Sample`, `Best practice`, `Internal sources`, `Rates`, `Temporal data`, `Regional sources`.

## Success criteria

1. Metadata includes total sources, total artifacts, scope, date.
2. Each pattern: description, mentions (or omission phrase), Popularity + Internal adoption trends, alignment + Basis.
3. External: 3–7 cited sources with URL, author, UTC timestamp, quote.
4. Internal: cited artifacts or `No Internal sources found.`
5. Irrelevant list when any excluded.
6. Facts only — no recommended decision.
7. Global block always; regional only when requested.

## References (skill implementation)

- `references/temporal-trends.md` — buckets, trend labels, assignment order, alignment rules
- `references/metrics.md` — mention formulas, alignment decision tree
- `references/cache-schema.md` — JSON field contract

## SKILL.md description (trigger draft)

Optimize with `docs/superpowers/evals/strict-best-practices-trigger-eval.json` before shipping. Under 1024 characters.

```yaml
description: >
  Use when the user intends to gather evidence before a design or approach
  choice at system level. Invoke when comparing options, evaluating trade-offs,
  learning how others solve the problem, or building an evidence block for a
  decision record — with verifiable external sources and internal project
  patterns, even if they do not say best practices, research, or ADR.
  Multidomain: API, infra, product, design, and beyond. Triggers on
  /strict-best-practices.
```

Description uses positive user intention only — out-of-scope asks are implicit.

### Out of scope (implicit, not in description)

Implementation, reference-only lookups without a design choice, task-boundary
without design evidence, backlog ranking, ADR file authoring.

## Placement

`strict-knowledge/skills/strict-best-practices/SKILL.md`

After implementation: sync `marketplace.json` if `strict-knowledge` not listed; update `README.md` availability note.
