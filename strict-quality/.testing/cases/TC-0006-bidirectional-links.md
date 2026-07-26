---
id: TC-0006
title: Bidirectional checklist hints resolve to existing TC/TS
scope: S-qual
layer: L-api
severity: V0
red_green: false
links:
  checklist:
    - C-api-02
preconditions:
  - TC-0005 preconditions
---

# TC-0006: linked_cases in checklists resolve

## Steps

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Collect all `TC-*` / `TS-*` IDs from cases and scenarios filenames + frontmatter | Set `T_valid` |
| 2 | For each checklist item `linked_cases` / `linked_scenarios` if present | Each ID ∈ `T_valid` |
| 3 | Spot-check reverse: TC-0001 listed under C-dom-04 in `C-L-dom.yaml` | Consistent with TC-0001 frontmatter |

## Pass criteria

No dangling `linked_cases` entries.

## Checklist linkage

**C-api-02** bidirectional navigation (recommended in ADR-004).
