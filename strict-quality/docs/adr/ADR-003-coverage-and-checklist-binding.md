# ADR-003: Coverage and Checklist Binding by Severity

**Status:** accepted  
**Date:** 2026-07-26  
**Deciders:** strict-quality  
**PRD:** PRD-001

## Context

Repo-wide coverage hides AI-generated gaps in critical cells. Checklists must tighten with severity without duplicating every rule per scope.

## Decision

**Effective severity** for cell `(S, L)`:

```text
effective(S, L) = min_numeric( scope.default_severity,
                              layer_override(S, L) ?? scope.default_severity )
```

Where `V0` is most critical (numeric order 0 … 3).

**Coverage:** thresholds come from `coverage-policy.yaml` keyed by `effective` only (M0). Future: optional per-scope multiplier.

**Checklist binding:** item in `C-L-*.yaml` includes `required_severity: Vn`. Item is **mandatory** on a PR that touches cell `(S, L)` iff:

```text
numeric(effective(S, L)) <= numeric(required_severity)
```

(i.e. more critical cells require items tagged for their level and above).

**Diff-on-PR:** for touched files mapped to `(S, L)`, enforce diff line coverage ≥ policy for `effective(S, L)` when enforcement is `block`.

**Mutation (`Q-mut`):** defined in `test-quality.yaml` per `(L, V)` minimum kill rate. Pilot default: enforce for `L-dom` at `V0`/`V1`; **warn** elsewhere for 30 days, then **block** per `enforcement.yaml`.

## Consequences

- Positive: Aligns effort with risk; checklist IDs stay finite.  
- Negative: Requires correct path→layer mapping; errors inflate or deflate requirements.  
- Neutral: Severity overrides are explicit in YAML (auditable).

## Alternatives considered

- Per-scope checklist files — rejected (proliferation).  
- Single global checklist — rejected (layer techniques differ).
