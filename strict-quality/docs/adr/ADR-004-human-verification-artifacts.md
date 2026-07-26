# ADR-004: Human Verification Artifacts and Checklist Linking

**Status:** accepted  
**Date:** 2026-07-26  
**Deciders:** strict-quality  
**PRD:** PRD-001

## Context

Automated gates miss UX, intent, and exploratory failures. Human verification must trace to the same `C-*` IDs as automated work for unified PR attestation.

## Decision

Two artifact types under `.testing/`:

### Test scenario (`TS-{nnnn}`)

- **Purpose:** time-boxed human session (exploratory or session-based testing).  
- **Location:** `.testing/scenarios/TS-{nnnn}-{slug}.md`  
- **Required frontmatter:** `id`, `title`, `scope`, `layer`, `severity`, `links.checklist[]`, `duration_max`, `roles[]`  
- **Body:** charter, areas to explore, heuristics, stop conditions, evidence to capture.

### Test case (`TC-{nnnn}`)

- **Purpose:** repeatable stepwise verification (manual or semi-automated).  
- **Location:** `.testing/cases/TC-{nnnn}-{slug}.md`  
- **Required frontmatter:** `id`, `title`, `scope`, `layer`, `severity`, `links.checklist[]`, `preconditions[]`, `red_green: true|false`  
- **Body:** steps with expected results, pass/fail, link to automated test name if any.

**Strict linking:**

- Every `TC-*` / `TS-*` MUST reference at least one valid `C-*` ID present in `.testing/checklists/`.  
- Checklist items MAY list `linked_cases: [TC-*]` and `linked_scenarios: [TS-*]` for bidirectional navigation (recommended, not required for M0).  
- PR attestation cites: `C-*` satisfied by `{automated job | TC-* run | TS-* session log}`.

**Red–green:**

- When `red_green: true`, step 1 documents expected failure before implementation; case ID appears in commit/PR title or test name.

## Consequences

- Positive: Reviewers see one ID graph from policy → checklist → human steps.  
- Negative: Maintaining bidirectional links is manual until tooling exists.  
- Neutral: Scenarios intentionally allow ambiguity; cases do not.

## Alternatives considered

- Test cases only in TestRail/etc. — rejected for OSS contract (external IDs optional as `external_ref` later).  
- Free-form QA markdown — rejected (no machine link to `C-*`).
