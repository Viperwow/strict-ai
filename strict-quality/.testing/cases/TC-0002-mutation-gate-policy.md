---
id: TC-0002
title: Mutation gate threshold documented for L-dom at V0/V1
scope: S-qual
layer: L-dom
severity: V1
red_green: true
links:
  checklist:
    - C-dom-03
preconditions:
  - `test-quality.yaml` and `enforcement.yaml` present
---

# TC-0002: Q-mut policy visible for domain layer

## Red phase (before implementation)

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Search repo for `Q-mut` enforcement on `L-dom` | Policy missing OR below ADR-003 minimum → document as FAIL |

## Green phase (after implementation)

| Step | Action | Expected result |
|------|--------|-----------------|
| 2 | Open `.testing/registry/test-quality.yaml` | `Q-mut` entries exist for `L-dom` + `V0` and `V1` with `min_kill_rate` |
| 3 | Open `.testing/registry/enforcement.yaml` | `Q-mut` block/warn schedule defined |

## Pass criteria

Green phase expectations met after M0 merge.

## Checklist linkage

Satisfies **C-dom-03** (mutation / test quality).
