# Journal format

## Template

````markdown
# PROJ-123 leftovers

last-run: 2026-10-15T14:02:00Z · open-count: 4

DoD: "<verbatim>"

## Requirements
- R-1 · "<verbatim>"

## Open
- L-4 · new · agent · critical · stated: medium · Q1 · from L-1 · depth 2 · 2026-10-15 · review PR #12
  "<question verbatim>"
  also: "<other wording verbatim>" · session

## Decided
- L-1 · decided · user · from R-1 · depth 1 · 2026-10-15 · session
  "<question verbatim>"
  → "<decision verbatim>"

## Later
- L-2 · viewed · user · from L-1 · depth 2 · 2026-10-15 · session
  "<question verbatim>"
  → backlog: PROJ-140

## Detached
- L-6 · new · user · 2026-10-15 · session
  "<remark verbatim>"

## Follow-ups
- L-2 · candidate ticket
  - L-7 · from L-2

## Graph
```mermaid
graph TD
  R1 --> L1 --> L4
  L1 --> L2
  L6
```
````

`Follow-ups` appears only after the task is done.

## Entry fields

| Field | Values |
|---|---|
| id | `R-n` requirement, `L-n` leftover; ids never change or get reused |
| status | `new` → `viewed` → `decided` |
| by | `user` \| `agent` |
| severity | `blocker` \| `critical` \| `high` \| `medium` \| `low`, assigned per the severity table |
| stated | the severity label the source gave, kept as-is; omitted when the source gave none |
| quadrant | Eisenhower `Q1`–`Q4`: importance = path to a requirement, urgency = severity `high` or above, or a stated deadline |
| from | parent id; absent for detached entries |
| depth | edges from the nearest requirement; absent for detached entries |
| source | where it was said: session, review, PR, tracker, messenger, or a session memory store |
| also | other wordings of the same entry, verbatim, each with its source |

Quotes never change. Section, status, `from`, and `depth` may change.

## Severity

Assigned by user impact, not by the source's label. When two levels fit, take the higher one and state why in one line.

| Level | Definition | Example |
|---|---|---|
| `blocker` | The task cannot be merged or shipped. | Build or tests fail. The main scenario of a requirement does not work. |
| `critical` | Harm with no workaround. | A vulnerability. Money loss. Personal-data leak. Data corruption. A regression breaks an existing feature. |
| `high` | A common scenario works wrong. A workaround exists. | A requirement behaves wrong in the typical case. Visible performance or visual degradation. |
| `medium` | A rare scenario works wrong. | An edge case with a simple workaround. |
| `low` | No effect on behavior. | Style, naming, a refactoring suggestion. |

## Graph

- One node per entry; edges follow `from`.
- Requirements are roots.
- Detached entries are unconnected nodes.
- Node style shows status: `new`, `viewed`, `decided`.
