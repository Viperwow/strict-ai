# Output format

Emit this template verbatim. Drop a surface row only when the trace found nothing for it, and list the dropped surfaces under Assumptions.

~~~markdown
## Blast radius: <entity>

**Radius:** <Contained | Crossing | Breaking> — <the one fact that set the tier>
**Change:** <one sentence describing the proposed change>

### Impact surfaces

| Surface | Count | Files |
|---|---|---|
| Callers | <n> | `path:line` — <why it appears> |
| Transitive dependents | <n> | `path` — <why it appears> |
| Tests | <n> | `path` — <what it asserts> |
| Configs | <n> | `path:key` — <how it binds> |
| Contracts | <n> | `path` — <exported name, endpoint, or schema> |
| Consumers | <n> | <consumer> — <contract it depends on> |

### Assumptions

- <unverified consumer, hop-limit boundary, or surface skipped by --fast>

## Surgical plan

**Minimal core**
1. `path` — <edit>

**Containment move:** <technique> — <the surface it keeps out of the radius>

**Deferred to follow-up**
- <cleanup, rename, or deletion split out>

**Verification**
- `<test command>` — <what passing proves>

**Alternative (radius: <tier>):** <one line, or "none narrower">
~~~

## Rules

- One entity per table row. Split a row that names two files.
- Cite `path:line` for callers and configs; `path` alone for the rest.
- State a count even when it is 0 — a zero is evidence.
- Keep every "why it appears" cell under ten words.
