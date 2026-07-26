---
id: TC-0003
title: Effective severity matches ADR-003 for S-qual L-dom
scope: S-qual
layer: L-dom
severity: V0
red_green: false
links:
  checklist:
    - C-dom-04
preconditions:
  - `severity.yaml` and `scopes.yaml` loaded
---

# TC-0003: Effective severity computation

## Steps

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Read `S-qual` `default_severity` in `scopes.yaml` | Value is `V1` |
| 2 | Read override for `(S-qual, L-dom)` in `severity.yaml` | `severity: V0` |
| 3 | Apply ADR-003 `min_numeric` rule | `effective(S-qual, L-dom) = V0` |
| 4 | Open `C-L-dom.yaml` items with `required_severity: V1` | Items C-dom-02, C-dom-03 mandatory at V0 cell (0 ≤ 1) |

## Pass criteria

Effective severity is V0; mandatory checklist set includes C-dom-02 through C-dom-04 per ADR-003 rule.

## Checklist linkage

**C-dom-04** registry correctness.
