# PRD-001: Scoped Testing Governance (strict-quality)

**Status:** draft  
**Date:** 2026-07-26  
**Owner:** strict-quality  
**Related:** ADR-001 … ADR-004, `.testing/` contract

## Problem

Teams using AI-assisted development hit a verification ceiling: PR volume and plausible-looking tests outpace human review. Coverage percentages and generic “write tests” guidance do not bind to **where** code lives, **how critical** it is, or **which test techniques** apply. Reviewers lack a shared, short-ID vocabulary and checklists per architectural layer.

## Goal

Deliver a **repo-local testing governance model** that:

1. Auto-discovers **scopes** and assigns stable short IDs (`S-*`).
2. Maps each path to a **layer** (`L-*`) inside a scope.
3. Assigns **severity** (`V-*`) at scope and layer granularity.
4. Defines **coverage thresholds** and **checklist requirements** per effective `(S, L, V)` cell.
5. Links **human verification** (test cases, test scenarios) to checklist items via the `.testing/` tree.
6. Supports **red–green** test authoring and **test-quality gates** (e.g. mutation) keyed by IDs.

Implementation skills, CI adapters, and auto-scoping tools are **out of scope for this PRD**; this document defines the product contract those artifacts must satisfy.

## Non-goals

- Replacing ISO/IEC/IEEE 29119 or OWASP corpora (we reference clusters, not duplicate them).
- Mandating a single CI vendor or language runtime.
- Fully automated scope discovery without human approval of `scopes.yaml`.
- Autonomous merge approval without human sign-off on attestation.

## Personas

| Persona | Need |
|---------|------|
| Developer / agent author | Know which tests and checklists apply to touched files before PR. |
| Human reviewer | Spot-check by severity and checklist IDs, not entire diff. |
| QA / test engineer | Maintain scenarios, cases, and layer checklists in `.testing/`. |
| Platform / lead | Set severity defaults and coverage policy once per repo. |

## Requirements

### FR-1 Scope registry

- **FR-1.1** The repo MUST maintain `scopes.yaml` under `.testing/registry/` with approved scope IDs `S-{slug}` (slug ≤ 12 chars, kebab-case).
- **FR-1.2** Each scope entry MUST list: `id`, `name`, `paths[]`, optional `owners[]`, optional `default_severity` (`V-*`).
- **FR-1.3** Auto-scoping MAY propose scopes; a human MUST approve changes via PR (see ADR-001).
- **FR-1.4** Every production code path MUST map to exactly one primary `(S, L)` (see ADR-001).

### FR-2 Layer catalog

- **FR-2.1** Layers MUST use shared IDs from `.testing/registry/layers.yaml` (e.g. `L-dom`, `L-app`, `L-api`, `L-inf`, `L-ui`).
- **FR-2.2** Each scope MAY enable a subset of layers with path globs under `.testing/registry/scopes.yaml` or per-scope layer blocks.

### FR-3 Severity

- **FR-3.1** Severity IDs MUST be `V0` … `V3` (ordered, lower = more critical) defined in `.testing/registry/severity.yaml`.
- **FR-3.2** Effective severity for cell `(S, L)` MUST be computed per ADR-003 and recorded in registry overrides when different from scope default.

### FR-4 Coverage policy

- **FR-4.1** `.testing/registry/coverage-policy.yaml` MUST define minimum line/branch (and optional diff-on-PR) thresholds keyed by effective `V-*`.
- **FR-4.2** Coverage reports SHOULD be aggregatable by `(S, L)` for touched files on a PR.

### FR-5 Layer checklists

- **FR-5.1** Each enabled layer MUST have a checklist file `.testing/checklists/C-{layer-slug}.yaml` (e.g. `C-L-api.yaml`).
- **FR-5.2** Each checklist item MUST have ID `C-{layer}-{nn}` (two-digit sequence), `title`, `test_types[]` (references testing taxonomy), and `required_severity` (minimum `V-*` at which item is mandatory).
- **FR-5.3** Optional automation hint: `automation: none | ci-job | manual-only`.

### FR-6 Test quality (meta)

- **FR-6.1** `.testing/registry/test-quality.yaml` MUST define gates such as `Q-mut` (mutation score) by `(L, V)` where applicable.
- **FR-6.2** Automated tests SHOULD embed metadata or naming convention `{S}_{L}_{V}_{C}_{desc}` (ADR-004).

### FR-7 Human verification artifacts

- **FR-7.1** **Test scenarios** (`TS-*`) live in `.testing/scenarios/` — session-based or exploratory flows for humans (see ADR-004).
- **FR-7.2** **Test cases** (`TC-*`) live in `.testing/cases/` — stepwise procedures with expected results.
- **FR-7.3** Every `TS-*` and `TC-*` MUST link to one or more checklist IDs `C-*` and optionally `(S, L, V)` cells via frontmatter `links.checklist[]`.
- **FR-7.4** Red–green development: new behavior MUST reference a checklist item; failing automated test or `TC-*` step precedes implementation when risk ≥ `V1`.

### FR-8 PR attestation (future skill)

- **FR-8.1** PR description SHOULD list satisfied `C-*` IDs and evidence (job name, `TC-*` run date, reviewer initials).
- **FR-8.2** Missing mandatory `C-*` for touched `(S, L, V)` MUST block merge when enforcement is enabled (policy flag in `.testing/registry/enforcement.yaml`).

## Success metrics

| Metric | Target (pilot) |
|--------|----------------|
| Paths with valid `(S, L)` mapping | 100% of non-excluded paths |
| Human review time on agent PRs | Measurable reduction with same or lower defect escape |
| Checklist linkage | 100% of `TC-*` / `TS-*` reference valid `C-*` |
| Mutation gate adoption | Defined for all `V0`/`V1` + `L-dom` cells in pilot scope |

## Milestones

| Phase | Deliverable |
|-------|-------------|
| **M0 (this PR)** | PRD, ADRs, `.testing/` reference tree, human `TC-*` / `TS-*` for registry validation |
| M1 | `scopes.yaml` generator skill (strict-labs) |
| M2 | CI adapter: diff coverage by `(S, L, V)` |
| M3 | Skill: PR attestation from touched paths |

## References

- `strict-quality/docs/reference/testing-structure-overview.md` — taxonomy clusters for checklist `test_types`.
- `docs/superpowers/specs/2026-05-19-strict-dod-design.md` — boundary contract pattern (analogous rigor for testing).

## Open questions

1. Single repo vs monorepo: one `.testing/` at root vs per-package — default root (ADR-002).
2. Block vs warn for mutation gate during baseline period — default warn for 30 days (ADR-003).
