# `.testing/` — scoped testing governance (reference)

This tree is the **reference contract** for [PRD-001](../docs/prd/PRD-001-scoped-testing-governance.md). Application repos copy the layout to **repository root** `.testing/`.

## Quick links

| Path | Purpose |
|------|---------|
| [registry/scopes.yaml](registry/scopes.yaml) | Approved `S-*` scopes |
| [registry/layers.yaml](registry/layers.yaml) | Canonical `L-*` |
| [registry/severity.yaml](registry/severity.yaml) | `V0`–`V3` + overrides |
| [registry/coverage-policy.yaml](registry/coverage-policy.yaml) | Coverage by severity |
| [registry/test-quality.yaml](registry/test-quality.yaml) | `Q-*` gates |
| [registry/enforcement.yaml](registry/enforcement.yaml) | block / warn |
| [checklists/](checklists/) | `C-*` per layer |
| [cases/](cases/) | `TC-*` human test cases |
| [scenarios/](scenarios/) | `TS-*` human scenarios |

## ID linking (strict)

```text
(S, L, V) cell  →  mandatory C-* items (ADR-003)
C-*             →  TC-* / TS-* via frontmatter links.checklist[]
C-*             →  automated tests via name/tag {S}_{L}_{V}_{C}_*
```

Human verification runs MUST record which `C-*` they satisfied in PR attestation or session notes.
