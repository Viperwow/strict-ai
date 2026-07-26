# Testing taxonomy reference (clusters)

Reference for checklist `test_types[]` values in `.testing/checklists/`. Not exhaustive; see ISO/IEC/IEEE 29119 and OWASP for full corpora.

## Correctness

| Type | Summary |
|------|---------|
| unit | Component-level automated tests |
| mutation | Deliberate faults to judge test strength |
| static | Analysis without execution |
| property-based | Properties over generated inputs |
| snapshot | Compare output to stored baseline |
| golden master | Behavior fixed before refactor |
| formal verification | Proof against specification |

## Data and combinations

| Type | Summary |
|------|---------|
| fuzz | Random or malformed inputs |
| combinatorial | Significant parameter combinations |
| pairwise | All pairs of parameter values |

## Integration

| Type | Summary |
|------|---------|
| contract | API agreements between services |
| backward-compatibility | Old clients and data |
| idempotency | Repeated operation safety |

## Reliability and performance

| Type | Summary |
|------|---------|
| chaos | Controlled large-scale failures |
| fault injection | Targeted failure insertion |
| concurrency | Parallel operations |
| race-condition | Ordering-dependent defects |
| soak / spike / volume / scalability | Load characteristics |

## Deployment and exploration

| Type | Summary |
|------|---------|
| canary / shadow / dark launch | Release strategies |
| exploratory | Simultaneous learning and testing |
| session-based | Time-boxed exploratory sessions |

## UI and security

| Type | Summary |
|------|---------|
| visual regression | Unintended UI changes |
| accessibility | a11y requirements |
| penetration | Exploitable vulnerability search |

## Classic levels (mapping hint)

Component → often `L-dom` / `L-app`. Integration → `L-inf`, `L-api`. System/acceptance → `TS-*` scenarios. Smoke/sanity/regression → attach to `TC-*` or CI jobs referenced in checklist `automation`.

Source: consolidated from project testing structure overview (2026-07).
