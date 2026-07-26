---
id: TC-0004
title: PRD and ADR set exists for scoped testing governance
scope: S-qual
layer: L-api
severity: V1
red_green: false
links:
  checklist:
    - C-api-01
preconditions:
  - Branch contains M0 documentation deliverable
---

# TC-0004: Governance documents present

## Steps

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Verify `strict-quality/docs/prd/PRD-001-scoped-testing-governance.md` exists | File present, status and FR sections readable |
| 2 | Verify ADR-001 … ADR-004 under `strict-quality/docs/adr/` | All four ADRs present, status accepted |
| 3 | Cross-check PRD milestones reference ADRs and `.testing/` | Links consistent with ADR-002 |

## Pass criteria

All documents present; no contradictory ID grammar vs ADR-001.

## Checklist linkage

**C-api-01** PRD/ADR for governance changes.
