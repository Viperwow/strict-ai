---
name: strict-blast-radius
description: Maps the blast radius of a proposed code change — callers, dependents, tests, configs, public API/contracts, and downstream consumers — then plans the most surgical edit that achieves the goal. Use before editing shared code, renaming or changing a signature, touching a public interface, migrating a schema, or whenever the question is "what else breaks if I change this?" or "what is the smallest safe change here?". Triggers on /strict-blast-radius.
---

# strict-blast-radius

Answers two questions about a proposed change: **what does it touch**, and **what is the smallest version of it that still works**.

Run this before editing, not after. The value is choosing a narrower change while the change is still cheap to redesign.

## Invocation

~~~
/strict-blast-radius [symbol, file, or change description]
/strict-blast-radius [target] --fast
/strict-blast-radius [target] --plan-only
~~~

**Rules:**
- No flag → full trace across all six surfaces, then the surgical plan.
- `--fast` → direct references and tests only; skip transitive tiers, git co-change, and consumer analysis.
- `--plan-only` → a radius report already exists in session; skip tracing and produce only the surgical plan.

## Data source order

1. Session context — files, symbols, and diffs already read in this session.
2. Repository — source tree, tests, configs, git history.
3. Ask the user — only for intent that code cannot reveal (external consumers, release constraints, deprecation windows).

## Step 1 — Pin the change surface

Name the exact entities the change would modify: symbol, file, endpoint, table, config key, env var. Vague targets produce vague radii.

If the request names a behavior rather than an entity, locate the entity first, then confirm the list back to the user in one line before tracing.

## Step 2 — Trace the six surfaces

Trace each surface in order. Record file path plus the reason it appears; an entry without a reason is noise.

| Surface | What to find |
|---|---|
| Callers | Every site invoking or importing the entity |
| Transitive dependents | Modules reached through those callers, one to two hops |
| Tests | Test files asserting on the entity or its callers |
| Configs | Config keys, env vars, feature flags, DI wiring, build files naming the entity |
| Contracts | Public API, exported types, schema, migration, protobuf, OpenAPI, event payload |
| Consumers | Code outside this repository bound by those contracts |

Prefer symbol-level lookup over text search — text search misses dynamic dispatch and over-reports comments. See [references/lookup-commands.md](references/lookup-commands.md) for the tool order and the exact commands.

`--fast` covers callers and tests only.

## Step 3 — Rate the radius

Assign one tier from the evidence, and state the single fact that drove it:

- **Contained** — callers live inside one module, no contract touched.
- **Crossing** — several modules or packages, contract stable.
- **Breaking** — a contract changes, or a consumer outside this repository is affected.

Uncertainty rounds upward. An unverified consumer is a Breaking assumption until checked.

## Step 4 — Report

Emit the radius report exactly as specified in [references/output-format.md](references/output-format.md).

## Step 5 — Plan the surgical change

Propose the narrowest edit that reaches the goal, then justify why nothing narrower works:

1. **Minimal core** — the smallest set of edits that delivers the behavior.
2. **Containment move** — the technique that keeps the radius smaller: add an overload instead of changing a signature; add a column instead of altering one; introduce an adapter at the boundary; feature-flag the new path; deprecate rather than delete.
3. **Deferred work** — call-site cleanups, renames, and dead-code removal split into a follow-up, listed explicitly so they are not lost.
4. **Verification** — the specific tests and checks that prove the radius held.

Offer at most two alternatives, and rank them by radius, not by elegance.

## Constraints

- Report what the repository shows. Mark inferred consumers as assumptions.
- Do not edit code during this skill; it produces a report and a plan.
- Bound the trace at two hops and say so when the boundary hides something.
