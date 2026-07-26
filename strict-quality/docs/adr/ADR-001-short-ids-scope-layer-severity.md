# ADR-001: Short IDs for Scope, Layer, and Severity

**Status:** accepted  
**Date:** 2026-07-26  
**Deciders:** strict-quality  
**PRD:** PRD-001

## Context

Auto-scoped repos need stable references in tests, checklists, CI reports, and human verification docs. Long paths and prose labels do not survive refactors or agent-generated PRs.

## Decision

Adopt three short ID namespaces:

| Prefix | Pattern | Example | Meaning |
|--------|---------|---------|---------|
| `S-` | `S-{slug}` | `S-pay`, `S-core` | Scope — ownable subtree |
| `L-` | `L-{slug}` | `L-dom`, `L-api` | Layer — role within scope (global catalog) |
| `V` | `V0`–`V3` | `V0` | Severity — ordered impact level |

Additional namespaces (see ADR-004):

- `C-{layer}-{nn}` — checklist item  
- `TC-{nnnn}` — human test case  
- `TS-{nnnn}` — human test scenario  
- `Q-{slug}` — test-quality gate  

**Primary mapping rule:** each file path maps to exactly one primary pair `(S, L)`. Secondary involvement (imports only) is out of scope for coverage gates in M0.

**Scope slug rules:** lowercase kebab-case, start with letter, max 12 characters, unique across registry.

**Auto-scoping workflow:**

1. Tool proposes `scopes.yaml` diff from packages, CODEOWNERS, import clusters.  
2. Human PR approves; IDs are never recycled for a different meaning in the same repo.  
3. Deprecation: mark scope `deprecated: true` with `superseded_by: S-new`.

## Consequences

- Positive: One vocabulary for agents, humans, and CI.  
- Negative: Initial approval PR required; renames need migration notes.  
- Neutral: Slugs are not globally unique across repos (only within repo).

## Alternatives considered

- UUID-only IDs — rejected (opaque in test names and review).  
- Path-only keys — rejected (breaks on moves, heavy in attestation).
