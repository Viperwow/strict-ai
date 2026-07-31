# Research queue

Overnight automation drains **Pending** (oldest first, max 1–3 per night).
Kinds: `research` (answer a question) · `experiment` (run a tool/check).
Enqueue: `/strict-overnight-research --queue` or `--experiment`.
Format: `strict-labs/skills/strict-overnight-research/references/queue-format.md`.

## Pending

- [ ] **r-002** What is the current official SKILL.md / Agent Skills contract (frontmatter, triggers, references layout)?
  - kind: research
  - notes: Compare Anthropic docs + skills.sh + public anthropics/skills examples against CLAUDE.md authoring rules; list gaps for strict-ai.
  - priority: P1
  - added: 2026-07-31

- [ ] **r-003** Best pattern for overnight research queues with Cursor Cloud Agents (repo queue vs automation memory vs both)?
  - kind: research
  - notes: Trade-offs for persistence, PR reviewability, and multi-device enqueue. Include how Memories tool interacts with committed queue files.
  - priority: P1
  - added: 2026-07-31

## Blocked

_(empty)_

## Done

- [x] **r-001** How should Cursor Automations be documented inside a skills marketplace repo? → [report](results/2026-07-31-cursor-automations-docs-in-skills-repo.md)
  - kind: research
  - done: 2026-07-31

- [x] **r-004** Verify `gh` CLI can list PRs for this repo → [report](results/2026-07-31-verify-gh-cli-list-prs.md)
  - kind: experiment
  - done: 2026-07-31
