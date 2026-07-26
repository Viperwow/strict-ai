---
id: TS-0001
title: Exploratory session — scoped testing registry coherence
scope: S-qual
layer: L-dom
severity: V0
duration_max: 45m
roles:
  - reviewer
  - qa
links:
  checklist:
    - C-dom-04
    - C-api-02
charter: |
  Explore whether a new contributor can predict which checklist items apply
  after changing files under strict-quality/.testing/ without reading all ADRs.
---

# TS-0001: Registry coherence exploratory session

## Session setup

- Time box: 45 minutes (session-based testing).
- Inputs: PRD-001, ADR-001, `.testing/registry/*`, one sample PR diff touching `scopes.yaml`.

## Charter questions

1. Can the reviewer derive `(S, L, V)` for each changed file in ≤ 2 minutes per file?
2. Are mandatory `C-*` items obvious from checklists without ambiguity?
3. Where would an AI-authored PR most likely fake coverage?

## Heuristics

- Change one path glob and observe which checklist items should flip mandatory.
- Attempt to add a duplicate `S-*` ID — expect TC-0001 to catch.
- Attempt TC with invalid `C-fake-99` — expect TC-0005 to catch.

## Stop conditions

- Critical confusion: two reviewers disagree on mandatory `C-*` for same diff.
- Session goal met: participant writes attestation list of `C-*` without opening ADRs.

## Evidence to capture

- Session notes with timestamps.
- List of satisfied checklist IDs: `C-dom-04`, `C-api-02` (minimum).
- Optional: link to recorded walkthrough.

## Checklist linkage

This scenario **exercises** C-dom-04 and C-api-02; run **TC-0001**, **TC-0005** during or after session for confirmation.
