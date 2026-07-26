---
id: TC-0005
title: Every TC-* file declares valid links.checklist IDs
scope: S-qual
layer: L-api
severity: V0
red_green: false
links:
  checklist:
    - C-api-02
preconditions:
  - All files in `.testing/cases/` and `.testing/scenarios/`
  - All files in `.testing/checklists/C-*.yaml`
---

# TC-0005: Strict checklist linking on test cases

## Steps

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Build set of all `C-*` IDs from `checklists/C-*.yaml` | Set `C_valid` |
| 2 | For each `cases/TC-*.md`, parse frontmatter `links.checklist` | Every ID ∈ `C_valid` |
| 3 | For each `scenarios/TS-*.md`, parse frontmatter `links.checklist` | Every ID ∈ `C_valid` |
| 4 | Confirm each TC/TS has ≥1 checklist ID | No empty `links.checklist` |

## Pass criteria

No orphan or unknown `C-*` references.

## Checklist linkage

**C-api-02** human artifact linking integrity.
