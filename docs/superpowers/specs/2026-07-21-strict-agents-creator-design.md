# Design Spec: strict-agents-creator

**Date:** 2026-07-21
**Status:** Draft
**Target package:** strict-agents (new top-level plugin) — renamed to `strict-agents-creator` on 2026-08-05; paths below read `strict-agents-creator/` today

---

## Problem

No repeatable way to spin up a well-scoped Claude Code subagent for a task or role. Today an agent is hand-written:
- Ad-hoc tool grants — no discipline about what it can touch.
- No fixed model — cost and behavior drift.
- No success criteria — no way to tell whether a later edit made the agent better or worse.
- Skills reinvented instead of reused.

---

## Solution

One skill, `strict-agents-creator`, in a new `strict-agents` plugin. From a task/role description it produces a valid Claude Code subagent `.md` — composed from existing skills — granted the right tools (including on-demand `uvx`/`npx` CLI), pinned to the most effective available model, and shipped with **at least one programmatic golden eval case** that defines "correct".

Maximize automation; keep humans only on irreversible gates (approving a new skill, approving the final write).

Generated agents are the *product*; they are not part of this plugin.

---

## Approach: single create-only skill (MVP)

MVP ships the `create` flow only.

Rejected / deferred:
- **update / improve in MVP** — YAGNI. Ship a stable core first; they attach without rework (see Phasing).
- **eval runner in MVP** — running a subagent's real path programmatically is non-trivial and the core (create + define contract) has zero dependency on it.
- **experiment / mutation** — out of scope for this skill entirely.
- **opencode-style granular permission model** — KISS; Claude Code's native `tools` / `disallowedTools` / `permissionMode` is enough.
- **`agents.md` convention as output** — that is ambient repo context, not an invokable agent.

---

## File Structure

Supporting assets go in a `references/` subdirectory next to `SKILL.md` — the standard skill layout.

```text
strict-agents/
  .claude-plugin/plugin.json
  skills/
    strict-agents-creator/
      SKILL.md
      references/
        interview.md            ← requirement question set + answer→field mapping
        skill-reuse.md          ← how step 3 picks skills without naming a required tool
        subagent-format.md      ← Claude Code frontmatter fields + assembled-file template
        eval-golden-cases.md    ← two-layer eval model + golden-case file format
        output-contract.md      ← report block, destinations, file rules

Generated at runtime (scope chosen per run):
  {project}/.claude/agents/<name>.md              OR   ~/.claude/agents/<name>.md
  {project}/.claude/agent-evals/<name>/case-01.md OR   ~/.claude/agent-evals/<name>/case-01.md
```

Evals sit outside the agents directory deliberately — Claude Code scans that tree recursively for agent definitions, and eval cases are not agents.

---

## Output format: Claude Code subagent

A subagent is a markdown file: YAML frontmatter (config) + body (system prompt), discovered from `.claude/agents/`. Identity comes from the `name` field only.

Frontmatter surface used (minimal — KISS): `name`, `description`, `tools`, `disallowedTools`, `model`, `skills`, `permissionMode`, plus `mcpServers`, `maxTurns` and `background` where a task needs them. Full field reference, including the traps around tool typos, model resolution order, and the fields plugin subagents ignore, lives in `references/subagent-format.md`.

---

## Create flow

Run in order. Steps 1 (survey) and 6 (eval) are non-skippable; step 7 is a human gate.

```text
1. Survey available skills      → reuse pool
2. Interview                    → role, inputs, output, constraints, success criteria, autonomy, tools
3. Skill selection (DRY)        → reuse from the survey; inline whatever nothing covers
4. Model selection              → pin model: + rationale
5. Assemble subagent .md        → frontmatter + system-prompt body
6. Define eval (MANDATORY)      → ≥1 golden case; blocks step 7 if absent
7. Review [HUMAN GATE]          → show .md + eval + both paths, await one confirmation
8. Write & report               → write, print activation step
```

---

## Eval model (two layers)

Frame: **floor-raising** (howtoeval.com) — "if the agent fails a golden case, it does not ship."

- **Correctness gate** — binary programmatic assertions on the agent's final state + required/forbidden tool calls, against the real agent path. Blocks shipping.
- **Efficiency metrics** — tool-call count, tokens, time. Recorded and compared before/after. **Never a gate.**

Mixing efficiency into the gate corrupts both signals. MVP only *defines* the golden case; running it and capturing efficiency is a later phase.

Golden-case file format is in `references/eval-golden-cases.md`.

---

## Decisions

| # | Decision | Why / rejected |
|---|---|---|
| AD1 | Output = Claude Code subagent `.md` | Native, invokable. Rejected agents.md, opencode format. |
| AD2 | Two-layer eval; correctness binary gate, efficiency non-gating; ≥1 golden case at create | Floor-raising; keeps signals uncorrupted. |
| AD3 | Model pinned per-agent, revisable | Reproducibility + cost control. |
| AD4 | One human gate: the final write | Max autonomy, human only on the irreversible step. An earlier design also gated new-skill creation; three GREEN runs never reached it, so the branch and its gate were cut. |
| AD5 | Temp CLI via body-prompt + `Bash` grant (`uvx`/`npx` on demand) | Frontmatter can't self-install tools. |
| AD6 | MVP = create only | YAGNI; stable core. |
| AD7 | New top-level plugin `strict-agents` | Explicit user request (guardrail #2). |
| AD8 | Only native `tools`/`disallowedTools`/`permissionMode` | KISS. |
| AD9 | Ask write destination each run (project vs user); print activation step | Per-run choice, reversible. |

---

## Phasing

- **Phase 1 (MVP, this spec):** `create` + mandatory eval *definition*.
- **Phase 2:** `update <agent>` (diff + confirm), eval **runner** + efficiency-metric capture, before/after report.
- **Phase 3:** `improve <agent>` (1–3 findings after a run).
- **Out of scope:** experiment / mutation.

---

## Constraints

- The skill names no external tool as a requirement. Step 1 surveys the session's own skill list, and step 3 adapts to whatever that survey returns — a discovery skill gets used when one is present, and its absence changes nothing. Naming a tool in the prose would make it a dependency; letting the survey decide keeps the skill dependency-agnostic.
- Authoring a reusable skill stays out of scope: the flow inlines an uncovered procedure into the agent body and reports a recurring gap for separate, deliberate extraction.
- Reuse before create (DRY): never reinvent an existing skill.
- Ask on ambiguity; never assume. A non-checkable success criterion cannot become a golden case, and the mandatory eval step blocks the write without one.
- New plugin must sync `marketplace.json` + README availability note + CLAUDE.md structure (guardrails #2, #12).
- KISS, DRY, SOLID (S first), 80/20, YAGNI.
