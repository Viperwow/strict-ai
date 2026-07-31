# Research queue

Overnight **research** and **experiment** tasks for this repository.

| Path | Purpose |
|:---|:---|
| [`queue.md`](./queue.md) | Pending / blocked / done topics |
| [`results/`](./results/) | Completed reports (research + experiment) |

## Daytime

```text
/strict-overnight-research --queue "Your research question"
/strict-overnight-research --experiment "Verify X CLI against Y"
```

Or edit `queue.md` using
`strict-labs/skills/strict-overnight-research/references/queue-format.md`.

Experiments need `hypothesis`, ordered `steps`, and `success` criteria.

## Nighttime

Create a Cursor Automation with the prompt in
`strict-labs/skills/strict-overnight-research/references/automation-prompt.md`.

Schedule → drains 1–3 pending items (research and/or experiments) → writes reports → opens a PR → morning digest.
