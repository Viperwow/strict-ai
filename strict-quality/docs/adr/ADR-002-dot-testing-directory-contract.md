# ADR-002: `.testing/` Directory Contract

**Status:** accepted  
**Date:** 2026-07-26  
**Deciders:** strict-quality  
**PRD:** PRD-001

## Context

Testing policy, checklists, and human verification artifacts must live in a predictable location linkable from PRs, skills, and CI. Ad hoc `docs/qa/` folders fragment linking.

## Decision

Consumer repositories (and this reference tree under `strict-quality/.testing/`) use a root-level **`.testing/`** directory:

```text
.testing/
  README.md                 # contract summary + link to PRD
  registry/
    scopes.yaml             # approved S-* + paths + layer paths
    layers.yaml             # canonical L-* definitions
    severity.yaml           # V0–V3 definitions + scope/layer overrides
    coverage-policy.yaml    # thresholds by V
    test-quality.yaml       # Q-* gates (mutation, etc.)
    enforcement.yaml        # block | warn per gate type
  checklists/
    C-L-dom.yaml
    C-L-api.yaml
    ...
  scenarios/                # TS-* human session flows
  cases/                    # TC-* stepwise human verification
  attestation/              # optional PR template snippets
```

**Linking rules:**

1. Checklist items are authoritative for *what* must be verified.  
2. `TC-*` and `TS-*` files MUST list `links.checklist: [C-*]` in YAML frontmatter.  
3. Automated tests SHOULD use naming `{S}_{L}_{V}_{C}_{behavior}` or tag equivalent.  
4. Skills and CI read registry YAML only from `.testing/registry/` (no duplicate policy paths).

Reference implementation for the strict-ai repo lives at **`strict-quality/.testing/`** to document the contract without forcing every plugin package to carry a copy. Application repos mount `.testing/` at **repository root**.

## Consequences

- Positive: Single discovery path; works with `.gitignore` exceptions if needed.  
- Negative: Dot-directory visibility — mitigated by README and skill triggers.  
- Neutral: Monorepos may later adopt `.testing/` per workspace package via ADR amendment.

## Alternatives considered

- `testing/` without dot — rejected (collides with Go/Java test source dirs).  
- Policy only in skill markdown — rejected (not machine-readable for CI).
