---
name: strict-best-practices
description: >
  Use when the user needs evidence before choosing an approach — industry best
  practices with verifiable sources and internal project patterns, not
  implementation. Invoke before ADR decisions, when comparing architectural or
  system design options, evaluating trade-offs, or grounding a design in how
  others solve it, even if they do not say best practices, research, or ADR.
  Covers API, infra, product, design, and other domains at system level (C4
  context through component). Returns pattern cards with
  citations, encounter rates, and alignment metrics in chat — no code changes,
  no recommended decision. Triggers on /strict-best-practices. Do not use for
  straight implementation, trivial syntax questions, scope-only DoD without
  research, or task prioritization scoring.
---

# strict-best-practices

Gathers evidence for design decisions: internal patterns plus verifiable external
sources. Returns a structured chat block for ADR or planning work elsewhere.
Facts only — never recommend which option to pick.

Granularity: C4 Context → Container → Component.

## Invocation

```text
/strict-best-practices [topic or scope]
/strict-best-practices --scope <c4-boundary> --region EU --verbose
```

| Parameter | Default | Purpose |
|---|---|---|
| `--scope` | from context | C4 system boundary |
| `--since` | auto | lower bound for external source age |
| `--sample-min` | `10` | minimum total sources before rates |
| `--sample-target` | `100` | external search target |
| `--region` | none | add regional block (`EU`, `CN`, …) |
| `--domain` | auto | knowledge domain hint |
| `--cache` | `on` | `on` \| `off` \| `refresh` |
| `--cache-ttl` | `30d` | cache entry lifetime |
| `--internal-only` | off | internal patterns only |
| `--external-only` | off | external practices only |
| `--verbose` | off | per-bucket temporal + full source lists |

Sane defaults — ask only when scope is missing and cannot be inferred.

## Auto-invoke

When the session is system design (trade-offs, approach choice, draft ADR,
C4 ≥ Container) and evidence would help, invoke this skill. Emit first:

```text
strict-best-practices: starting research (sample target 100)…
```

Do not auto-invoke for straight implementation, trivial syntax, scope-only DoD,
or task scoring.

## Work

1. **Parse** invocation flags; infer `--scope`, `--domain`, `--region` from context when omitted.
2. **Cache read** — scan [references/cache-schema.md](https://github.com/Viperwow/strict-ai/blob/main/strict-knowledge/skills/strict-best-practices/references/cache-schema.md); reuse raw entries within TTL unless `--cache refresh`. Skip writes when `--cache off`.
3. **Internal scan** — search project artifacts (code, OpenAPI, CI, docs, design tokens, configs). Collect paths, UTC timestamps, verbatim quotes. Respect `--internal-only`.
4. **External research** — search toward `--sample-target`. Prefer verifiable sources: RFC, specs, papers, eng blogs, magazines, regional publications when relevant. Each source: URL, author, UTC timestamp, verbatim quote, stance, type. Present 3–7 best per pattern in chat. Respect `--external-only`.
5. **Pattern grouping** — cluster findings into named patterns. Per pattern: description ≤ 30 words, metrics, sources.
6. **Compute metrics** — encounter, phase, verdict, alignment per [references/metrics.md](https://github.com/Viperwow/strict-ai/blob/main/strict-knowledge/skills/strict-best-practices/references/metrics.md) and [references/temporal-phases.md](https://github.com/Viperwow/strict-ai/blob/main/strict-knowledge/skills/strict-best-practices/references/temporal-phases.md). Recompute every run; never read metrics from cache.
7. **Cache write** — persist raw acquired data per best-practice file. Include scope-irrelevant sources. Skip computed fields.
8. **Output** — formatted chat block (below). List scope-irrelevant pattern labels at end (no stats).

## Output

Header:

```markdown
## strict-best-practices output
```

### Research metadata

```markdown
### Research metadata
- **Scope:** …
- **Sample:** total sources: 47 · total artifacts: 25
- **Sample target:** 100 · sample-min: 10
- **Temporal scale:** project-age-adjusted (project age: 4mo)
- **Research date:** YYYY-MM-DD
```

### Pattern card

Sort by external mention rate descending.

```markdown
### Pattern: Cursor-based pagination

**Description:** Key-based pagination for large lists; avoids offset cost at scale.

**Encounter (external):** mention 38% (18/47) · positive 28% · negative 4% · neutral 6%
**Encounter (internal):** 12% (3/25)

**External phase:** trending → **growing**
**Internal phase:** hot → **emerging**

**Alignment:** misaligned
*Basis:* external mass in stable (1Y+); internal mass in artifacts <3M old.

**External sources:**
- [Title](url) — Author, 2025-03-12 — positive — "…"
- … +2 more in sample

**Internal sources:**
- `api/handlers/list.go` — "…"
```

Per-pattern internal absence: `No Internal sources found.`

Regional: global block always; separate regional block when `--region` set, with `vs global`.

### Excluded from sample

```markdown
### Excluded from sample (irrelevant to scope)
- OAuth2 token rotation in mobile SDKs
```

Labels only. Raw sources still cached for later runs.

### Verbose

Off (default): phase + verdict; top 5 sources per list. On: per-bucket shares, all sources, cache hit notes, expanded Basis.

## Absence phrases

Follow `CLAUDE.md` § Absence phrases. Entities: `Sources`, `Patterns`, `Sample`, `Best practice`, `Internal sources`, `Rates`, `Temporal data`, `Regional sources`.

## Forbidden

- Write or create ADR, PRD, or other decision files
- Recommend a winning option or confidence score
- Edit project files or produce implementation plans at file level
- Skip research when invoked or auto-invoked

## References

- [references/temporal-phases.md](https://github.com/Viperwow/strict-ai/blob/main/strict-knowledge/skills/strict-best-practices/references/temporal-phases.md)
- [references/metrics.md](https://github.com/Viperwow/strict-ai/blob/main/strict-knowledge/skills/strict-best-practices/references/metrics.md)
- [references/cache-schema.md](https://github.com/Viperwow/strict-ai/blob/main/strict-knowledge/skills/strict-best-practices/references/cache-schema.md)

Trigger eval set: [docs/superpowers/evals/strict-best-practices-trigger-eval.json](https://github.com/Viperwow/strict-ai/blob/main/docs/superpowers/evals/strict-best-practices-trigger-eval.json)
