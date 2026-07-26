---
id: TC-0001
title: Scope registry IDs are unique and paths do not overlap
scope: S-qual
layer: L-dom
severity: V0
red_green: false
links:
  checklist:
    - C-dom-01
    - C-dom-04
preconditions:
  - Checkout branch with `.testing/registry/scopes.yaml`
  - Read ADR-001 and ADR-002
---

# TC-0001: Scope registry uniqueness

## Steps

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | List all `id` values under `scopes:` in `scopes.yaml` | No duplicate `S-*` IDs |
| 2 | For each scope, collect all `paths` globs | Every glob is non-empty and valid for repo layout |
| 3 | For each pair of scopes, check path intersection on sample files | No file matches two primary scopes (excluding `excluded_paths`) |
| 4 | Verify each scope `layers[].paths` is under scope `paths` | No layer path escapes scope boundary |

## Pass criteria

All expected results hold. Log exceptions with file path and both scope IDs.

## Evidence

PR comment or session note: `TC-0001 PASS` + date + initials.

## Checklist linkage

Satisfies **C-dom-04** (registry integrity), supports **C-dom-01** when domain tests cover registry parsers (future).
