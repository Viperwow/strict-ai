# Queue format

File: `docs/research/queue.md`

## Structure

```markdown
# Research queue

## Pending

- [ ] **r-001** Title of the question
  - kind: research
  - notes: optional context, links, constraints
  - priority: P0|P1|P2   # default P1
  - added: YYYY-MM-DD

- [ ] **r-002** Verify gh CLI can list open PRs for this repo
  - kind: experiment
  - hypothesis: `gh pr list` returns exit 0 and at least the columns NUMBER,TITLE,STATE
  - steps:
    1. `gh --version`
    2. `gh pr list --repo Viperwow/strict-ai --limit 5`
  - success: exit 0 on both; output includes header or rows
  - notes: optional setup / env assumptions
  - priority: P1
  - added: YYYY-MM-DD

## Blocked

- [ ] **r-003** Title
  - kind: research|experiment
  - notes: why blocked / what is missing
  - blocked: reason
  - added: YYYY-MM-DD

## Done

- [x] **r-000** Title → [report](results/YYYY-MM-DD-slug.md)
  - kind: research|experiment
  - done: YYYY-MM-DD
```

## Fields

| Field | research | experiment | Notes |
|:---|:---|:---|:---|
| `kind` | required | required | `research` or `experiment` |
| `notes` | optional | optional | Context, links |
| `priority` | optional | optional | Default `P1` |
| `hypothesis` | — | required | What we expect to observe |
| `steps` | — | required | Ordered, concrete commands or UI actions |
| `success` | — | required | Pass criteria (exit codes, substrings, artifacts) |
| `blocked` | when blocked | when blocked | Why night mode stopped |

## Rules

1. Ids are `r-NNN`, zero-padded, monotonically increasing. Never reuse. Shared counter for both kinds.
2. Pending order = process order. Move P0 above P1/P2 manually if needed.
3. One question **or** one experiment per item. Split compounds when enqueueing.
4. Experiment `steps` must be executable without inventing a protocol. If vague → ask at enqueue time or refuse.
5. On completion: Pending → Done in the same edit as the report commit.
6. On blocker: move to Blocked; do not invent answers or fake experiment results.
7. Omit `kind` only on legacy items → treat as `research`.
