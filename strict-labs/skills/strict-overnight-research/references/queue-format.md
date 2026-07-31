# Queue format

File: `docs/research/queue.md`

## Structure

```markdown
# Research queue

## Pending

- [ ] **r-001** Title of the question
  - notes: optional context, links, constraints
  - priority: P0|P1|P2   # default P1
  - added: YYYY-MM-DD

## Blocked

- [ ] **r-002** Title
  - notes: why blocked / what is missing
  - blocked: reason
  - added: YYYY-MM-DD

## Done

- [x] **r-000** Title → [report](results/YYYY-MM-DD-slug.md)
  - done: YYYY-MM-DD
```

## Rules

1. Ids are `r-NNN`, zero-padded, monotonically increasing. Never reuse.
2. Pending order = process order. Move P0 items above P1/P2 manually if needed.
3. One question per item. Split compound questions when enqueueing.
4. `notes` are optional but preferred when the question is ambiguous.
5. On completion: move the line from Pending → Done in the same edit as the report commit.
6. On blocker: move to Blocked; do not invent answers.
