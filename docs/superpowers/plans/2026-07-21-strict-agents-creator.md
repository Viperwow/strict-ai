# strict-agents-creator Implementation Record

> **Not an executable plan.** The repo's convention plans inline the exact file content and can be replayed step by step. This one documents work already built in PR #10 and points at the shipped files as the single source of truth, so it reads as a record of how the package is put together, not a script to re-run. Steps keep `- [ ]` syntax for structure only.

**Goal:** A `strict-agents` plugin whose `strict-agents-creator` skill turns a task or role into a valid Claude Code subagent `.md` — composed from existing skills, granted the right tools, pinned to a model, and shipped with a mandatory golden eval contract.

**Architecture:** One `SKILL.md` + five `references/*.md` in `strict-agents/skills/strict-agents-creator/`. No code — pure markdown instructions; the plugin is auto-discovered. The skill runs an 8-step create flow with **one human gate** (step 7) and **two non-skippable steps** (survey §1, eval §6). Output is a subagent file under `.claude/agents/` plus a golden case under `.claude/agent-evals/`.

**Spec:** `docs/superpowers/specs/2026-07-21-strict-agents-creator-design.md`

**Tech Stack:** Claude Code plugin + skill (SKILL.md), Markdown, YAML frontmatter, JSON manifests.

## Global Constraints

- Frontmatter of every `SKILL.md`: exactly `name` + `description` (repo convention).
- `description` = triggering conditions only ("Use when…"), never a workflow summary.
- New top-level package requires explicit user approval (guardrail #2) — granted for `strict-agents`.
- After adding skills to a plugin, sync `marketplace.json` + the root README availability note (guardrail #12).
- No AI attribution trailers in commit messages or PR bodies.
- The skill names no external tool as a requirement.
- KISS, DRY, SOLID (S first), YAGNI. Reuse before create.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `strict-agents/.claude-plugin/plugin.json` | Plugin manifest |
| Create | `.../strict-agents-creator/SKILL.md` | The skill — flow table, rules, common mistakes |
| Create | `.../references/interview.md` | Requirement question set + answer→field mapping |
| Create | `.../references/skill-reuse.md` | How §3 picks skills without naming a required tool |
| Create | `.../references/subagent-format.md` | Frontmatter fields, traps, assembled-file template |
| Create | `.../references/eval-golden-cases.md` | Two-layer eval model + golden-case format |
| Create | `.../references/output-contract.md` | Paths, gate-7 block, report block, recurring gap |
| Modify | `.claude-plugin/marketplace.json` | Register plugin; bump `metadata.version` |
| Modify | `README.md` | Packages table row + availability note |
| Modify | `CLAUDE.md` | Canonical structure + packages table |

---

## Task 1: Plugin scaffold

**Files:** `strict-agents/.claude-plugin/plugin.json`

**Interfaces:** Produces the plugin name `strict-agents`, consumed by `marketplace.json` in Task 4.

- [ ] **Step 1: Create `plugin.json`** — mirror the sibling manifests: `name`, `version` `0.1.0`, `description`, `author{name,email}`, `keywords[]`.
- [ ] **Step 2: Verify** — `python -m json.tool strict-agents/.claude-plugin/plugin.json` prints valid JSON.

No plugin-level `README.md`: no sibling plugin ships one, and the overview, eval model, and scope already live in the design spec. Adding one here would duplicate the spec and set a convention the repo does not follow.

---

## Task 2: The skill — `SKILL.md`

**Files:** `strict-agents/skills/strict-agents-creator/SKILL.md`

**Interfaces:** Consumes the five `references/*.md` from Task 3. Produces the `/strict-agents-creator` entry point.

- [ ] **Step 1: Create the skill file.** Shipped file is authoritative. Its sections and what each must carry:

| Section | Requirement |
|---|---|
| Frontmatter | `name: strict-agents-creator`; `description` starting "Use when…", triggering conditions only, ending "Triggers on /strict-agents-creator." |
| `## Invocation` | `/strict-agents-creator [role or task description]`, one flow, no subcommands |
| `## Create flow` | 8-row table: step, what you do, gate. Exactly one `human clears` (step 7) and two `never skip` (steps 1, 6) |
| `## Rules` | Per-step detail the table cannot hold: §1 survey mechanism, §2 interview coverage, §3 reuse-first, §4 always pin `model:`, §5 assembly, §6 eval blocks §7, §7 show paths with the artifact, §8 never write before the gate |
| `## Common mistakes` | Rationalization table built from the RED baseline failures |
| `## References` | All five reference files |

- [ ] **Step 2: Verify frontmatter** — `Get-Content .../SKILL.md -TotalCount 3` shows `---`, `name: strict-agents-creator`, and a `description:` starting "Use when".

---

## Task 3: References

**Files:** the five files under `strict-agents/skills/strict-agents-creator/references/`

**Interfaces:** Produces the question set, selection order, field reference, eval format, and output contract consumed by Task 2 §2–§8.

- [ ] **Step 1: `interview.md`** — the seven requirement topics and the answer→field mapping table.
- [ ] **Step 2: `skill-reuse.md`** — the selection order (reuse from the survey → optional discovery when the session has one → inline the procedure), why the flow depends on no named tool, and why extracting a reusable skill is a separate task.
- [ ] **Step 3: `subagent-format.md`** — the frontmatter field table, the three traps (silent tool-typo degradation, model resolution order, fields plugin subagents ignore), `tools` inherit-vs-restrict rules, model guidance, the assembled-file template, and the note that the body loads CLAUDE.md and git status rather than starting blank.
- [ ] **Step 4: `eval-golden-cases.md`** — the two-layer model, what makes a good case, the case format, and an honest statement that the skill produces the contract and not a runner.
- [ ] **Step 5: `output-contract.md`** — the path table (agent under `.claude/agents/`, eval under `.claude/agent-evals/`), the gate-7 block, the report block, and the conditional recurring-gap block.
- [ ] **Step 6: Verify** — `Get-ChildItem .../references` lists all five.

---

## Task 4: Repo integration

**Files:** `.claude-plugin/marketplace.json`, `README.md`, `CLAUDE.md`

- [ ] **Step 1: Register the plugin.** Bump `metadata.version` to the next minor and append:

```json
{
  "name": "strict-agents",
  "source": "./strict-agents",
  "description": "Create scoped Claude Code subagents from a task or role, with a mandatory golden eval contract.",
  "version": "0.1.0",
  "category": "agents"
}
```

- [ ] **Step 2: Root `README.md`** — add the packages-table row and append `strict-agents` to the "Available in marketplace" note.
- [ ] **Step 3: `CLAUDE.md`** — add `strict-agents/` to the canonical structure block and a row to the Packages table.
- [ ] **Step 4: Verify and commit** — `python -m json.tool .claude-plugin/marketplace.json` is valid, then commit without AI attribution trailers.

---

## Validation (RED / GREEN)

Per superpowers:writing-skills. Fresh-context subagent per run, each under pressure to skip the process.

**RED — baseline, no skill.** Task: a PR-diff summarizer, framed as "in a hurry, no ceremony, we don't need evals for something this trivial". The agent skipped the eval, skipped any survey, produced the file in one shot with no gate, and said so plainly in its self-report.

**GREEN — three runs, each after the skill changed.**

| Run | Scenario | Result |
|---|---|---|
| 1 | PR-diff summarizer, same pressure as RED | Survey done, golden case written, nothing written before the gate, model pinned |
| 2 | Log-error summarizer, "write it straight to disk" | Reused a session skill via `skills:`, wrote a case including a prompt-injection forbidden call, held the gate |
| 3 | CSV missing-values, "skip the ceremony, I'm blocked" | Held all three; quoted the common-mistakes row back: *"'no eval needed' is the exact belief the skill flags as a common mistake"* |
| 4 | Terraform destroy-guard, pool declared as three unrelated skills, no discovery tool present | Invoked no discovery tool, inlined the procedure, left `skills:` empty, held the gate |

Run 4 existed to test the dependency-agnostic §3 specifically: §3 degrades to a no-op when no skill ecosystem is present, which is the property the change was after.

Run 3 also drove a design change. Across the first three runs §3 never reached the skill-authoring branch — the agent either found a reuse hit or reasoned "one-off, goes in the body". That branch and its human gate were speculative machinery, so both were cut, leaving one gate.

**Honest limits.** One rep per arm; the methodology recommends 5+ for variance, so treat the separation as strong but not exhaustive. Transcripts live in the PR conversation rather than in the repo, so a reader cannot re-derive these results from the tree alone. Untested paths: the recurring-gap report block, and an agent that genuinely needs `uvx`/`npx`.

**Postdating run 4.** A review pass then corrected several facts in `subagent-format.md`, moved the destination choice into gate 7, and moved eval files out of the scanned agents tree. Those edits changed the gate structure, so the four runs above do not cover the current text. A fifth GREEN is owed before treating the gate behaviour as re-verified.

---

## Self-Review

**Spec coverage:**

| Spec requirement | Where |
|---|---|
| Survey available skills first, with a stated mechanism | Task 2 §1 |
| Interview for requirements | Task 2 §2 + Task 3 `interview.md` |
| Skill selection: reuse → optional discovery → inline; no named tool required | Task 2 §3 + Task 3 `skill-reuse.md` |
| Model pinned per-agent, never inherited | Task 2 §4 + Task 3 `subagent-format.md` |
| Assemble subagent `.md` (frontmatter + body) | Task 2 §5 + Task 3 `subagent-format.md` |
| Mandatory golden eval, blocks the write | Task 2 §6 + Task 3 `eval-golden-cases.md` |
| One human gate, showing artifact and paths together | Task 2 §7 + Task 3 `output-contract.md` |
| Write, report, activation step | Task 2 §8 + Task 3 `output-contract.md` |
| Temp CLI via body + `Bash` | Task 2 §5 + Task 3 `subagent-format.md` |
| Two-layer eval model | Task 3 `eval-golden-cases.md` |
| New plugin `strict-agents` | Task 1 |
| Marketplace / README / CLAUDE.md sync (#2, #12) | Task 4 |

Every shipped file appears in the File Map, and every row above points at content that exists. No row describes machinery that was cut.
