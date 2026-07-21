---
name: strict-agents-creator
description: Use when the user wants a new custom Claude Code subagent or agent for a task or role — building, scaffolding, or spinning up a specialized agent/subagent, deciding which skills and tools it needs, pinning its model, or defining what a correct agent output looks like. Triggers on /strict-agents-creator.
---

# strict-agents-creator

Turns a task or role into a ready-to-use Claude Code subagent: composed from existing skills, granted only the tools it needs, pinned to a model, and shipped with a programmatic eval contract. You assemble; the human confirms only the irreversible steps.

## Invocation

```text
/strict-agents-creator [role or task description]
```

One flow, no subcommands.

## Create flow

Run the steps in order.

| Step | You do | Gate |
|---|---|---|
| 1 | Survey the skills available in this session — this is the reuse pool | **never skip** |
| 2 | Interview for requirements — `references/interview.md` | — |
| 3 | Pick skills the agent composes — `references/skill-reuse.md` | — |
| 4 | Pin `model:` with a one-line rationale | — |
| 5 | Assemble the `.md` — `references/subagent-format.md` | — |
| 6 | Define ≥1 golden case — `references/eval-golden-cases.md` | **never skip** |
| 7 | Show the `.md`, the case, and the paths — wait for confirmation | human clears |
| 8 | Write and report — `references/output-contract.md` | — |

## Rules

- Do not skip the survey (step 1) or the eval (step 6).
- **Step 1.** Read the available-skills listing already in your context. When none is there, glob `.claude/skills/*/SKILL.md`, `~/.claude/skills/*/SKILL.md`, and `*/skills/*/SKILL.md` under the repo, then read the `name` and `description` frontmatter of each hit.
- **Step 2.** Cover role/task, inputs, output artifact, constraints and forbidden actions, success criteria (these drive the eval), autonomy, and needed tools. Ask only what the invocation and session context leave open; stop once you can assemble the agent.
- **Step 3.** Reuse beats create. Take what the survey found; a need nothing covers goes into the agent body. Never reinvent a skill that already exists, and never let a missing helper block the flow.
- **Step 4.** Always pin `model:` explicitly; never leave it to inherit from the calling session. Default `sonnet`; `opus` for heavy reasoning or architecture, `haiku` for cheap narrow work. Revisit the pick as stronger models land.
- **Step 5.** Phrase `description` by triggering conditions so it fires across relevant contexts, and keep the specialization in the body. Grant `Bash` when the agent runs `uvx`/`npx` on demand. Give the body explicit stop criteria and a required output shape.
- **Step 6.** The golden case is the correctness contract — **step 7 blocks until a golden case exists.**
- **Step 7.** Decide the destination before showing, and include both paths in the block so one confirmation covers the agent, the case, and where they land. On `edit: ...`, apply the change and re-show.
- **Step 8.** **Never write until the human clears gate 7 and a golden case exists.**

## Common mistakes

| Mistake | Reality |
|---|---|
| "This agent is trivial, it needs no eval" | Trivial agents regress too. One case runs about twelve lines and is the only thing that makes correctness checkable instead of asserted. |
| Assembling before surveying | You reinvent a skill that already exists. The survey is one pass over the session list. |
| Writing the file, then asking | An installed subagent fires automatically on later prompts, so the write is the irreversible step. Show first. |
| Leaving `model:` unset | It then inherits the caller's model, and cost and behavior drift per session. Pin it. |
| Listing `Skill` in `tools` | `tools` names tools. `skills` preloads skills. |
| Padding `tools` with everything | Grant what the task needs. Reach for `disallowedTools` to subtract from an inherited set. |

## References

- `references/interview.md` — the requirement question set.
- `references/skill-reuse.md` — how step 3 picks skills without depending on any named tool.
- `references/subagent-format.md` — frontmatter fields and the assembled-file template.
- `references/eval-golden-cases.md` — the golden-case format and the two-layer eval model.
- `references/output-contract.md` — the report block, destinations, and file rules.
