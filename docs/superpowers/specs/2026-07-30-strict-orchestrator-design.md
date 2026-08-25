# Design Spec: Day Orchestration Stack

**Date:** 2026-07-30  
**Branch (planning):** `feat/strict-orchestrator`  
**Status:** approved direction — implement 1 skill per session / worktree

## Problem

Before planning a workday, the user has a pool of ~20 tasks and needs:

1. Importance / urgency of each task
2. Approximate effort
3. Visual rollout (Gantt)
4. Energy-aware scheduling (deep work at high energy, shallow/auto at low energy)
5. Status overview + recommended cut for today
6. Optional dispatch into an agent orchestrator (Orca today; agent-agnostic contract)

## Principles

1. **Atomic skills teach *how*.** One skill = one job. No scoring inside Gantt, no Mermaid inside day-plan.
2. **Workflows teach *strategy*.** Composition, order, when to stop, how to present the day.
3. **Adapters are replaceable tool glue.** Business logic never lives in `strict-adapters`.
4. **Extract on 2+ consumers.** First consumer keeps content inline or owns a local `references/`. Second consumer triggers a shared reference (or skill, only if user-facing setup is needed).
5. **1 skill = 1 session = 1 worktree = 1 PR** when logic changes. Typos/docs may share a session.
6. **Agent-agnostic core.** Plan and recommendations are neutral data + markdown/Mermaid. Runtimes map via adapters.

## Architecture (target)

```text
                    ┌─────────────────────────────┐
                    │  strict-orchestrator        │
                    │  (strict-workflows)         │
                    │  compose strategy for day   │
                    └─────────────┬───────────────┘
          ┌───────────┬───────────┼───────────┬───────────┐
          ▼           ▼           ▼           ▼           ▼
   strict-goals  strict-impact  day-plan    gantt    task-status
   (labs)        (labs)         (workday)   (mgmt)   (workday)
          │           │           │
          │           │           └── reads energy (inline until 2nd consumer)
          │           │
          └───────────┴── shared file contracts (goals, scoring)
                                          │
                                          ▼ optional
                               strict-adapters/orca
                               (dispatch_plan → Orca)
```

No new top-level package. Branch name `feat/strict-orchestrator` is the *feature*, not a package name.

---

## Full skill inventory

### Existing (reuse — do not reinvent)

| Skill | Package | Job | Notes for orchestration |
|---|---|---|---|
| `strict-goals` | `strict-labs` | Goals + scoring weights | Input to impact; read `~/.strict-ai/goals.md` |
| `strict-impact` | `strict-labs` | Multi-method task score | Batch via `--fast` for pool triage |
| `strict-task-status` | `strict-workday` | Status + steps for **one** task | Energy table currently inline |
| `strict-dod` | `strict-workday` | Definition of Done | Out of scope for day orchestrator MVP |
| `strict-agents-creator` | `strict-agents` | Build subagents | Optional later: wrap orchestrator as agent |

### New atomics

| Skill | Package | Job | Explicitly does NOT |
|---|---|---|---|
| `strict-gantt` | `strict-management` | Render a timeline from already-scheduled items (Mermaid Gantt default) | Score, estimate, pick “today”, apply energy |
| `strict-day-plan` | `strict-workday` | From task pool + hours left + energy profile → today’s cut + time slots + deferred | Draw Gantt, call Orca, deep-score methods |

### New workflow

| Skill | Package | Job | Explicitly does NOT |
|---|---|---|---|
| `strict-orchestrator` | `strict-workflows` | Strategy: gather pool → score (impact) → day-plan → gantt → status summary → optional dispatch | Own scoring formulas, own Mermaid rules, own Orca CLI flags |

### New adapter (after workflow stable)

| Skill / module | Package | Job | Explicitly does NOT |
|---|---|---|---|
| `orca` | `strict-adapters/orca` | Map `dispatch_plan` → Orca orchestration CLI / skill | Decide what to do today |

### Deferred (not MVP — create only when rule fires)

| Item | When | Form |
|---|---|---|
| `energy-profile` shared reference | Second consumer exists (`day-plan` + `task-status`) | `strict-workday/references/energy-profile.md` preferred over a skill |
| `strict-energy` skill | User needs `--setup` / personal curve, or 3rd independent invoker | `strict-workday` skill |
| `strict-estimate` | Effort estimation logic duplicated outside day-plan/impact | Atomic in `strict-management` or `strict-workday` |
| Promote `strict-impact` / `strict-goals` out of labs | Stable home clear | Likely `strict-management` |

---

## Shared / reference blocks

### Ownership rule

- Skill-local `references/` — only that skill uses it (methods, output format).
- Package-level `references/` — 2+ skills in the **same** package.
- `strict-foundation` — 2+ skills across **different** packages.
- Do not create foundation files until the second cross-package consumer is real.

### Existing references (keep)

| Path | Owner | Consumers |
|---|---|---|
| `strict-labs/skills/strict-goals/references/goals-format.md` | goals | goals, impact (via file) |
| `strict-labs/skills/strict-impact/references/scoring-output.md` | impact | impact |
| `strict-labs/skills/strict-impact/references/method-*.md` | impact | impact |

### New skill-local references

#### `strict-gantt`

| File | Content |
|---|---|
| `strict-management/skills/strict-gantt/references/gantt-input.md` | Input schema: scheduled items |
| `strict-management/skills/strict-gantt/references/mermaid-gantt.md` | Mermaid syntax rules, date/time format, dependency edges, section grouping |
| `strict-management/skills/strict-gantt/references/examples.md` | 1–2 golden render examples |

**Input (conceptual):**

```text
GanttItem:
  id: string
  label: string
  start: datetime or day-relative (e.g. 10:00)
  end: datetime or duration
  section?: string          # e.g. Deep / Shallow / Wait
  deps?: string[]           # other ids
  status?: pending|active|done|blocked
```

#### `strict-day-plan`

| File | Content |
|---|---|
| `strict-workday/skills/strict-day-plan/references/day-plan-output.md` | Output contract: DayPlan |
| `strict-workday/skills/strict-day-plan/references/cognitive-load.md` | `deep` / `normal` / `shallow` definitions + mapping hints |
| `strict-workday/skills/strict-day-plan/references/examples.md` | Golden: pool in → today/deferred out |

Until energy is extracted, **copy or inline** the energy bands from `strict-task-status` inside day-plan SKILL (duplication accepted for one release). Extraction session follows when both ship.

**Output (conceptual):**

```text
TaskStub:
  id: string
  title: string
  score?: number            # from impact if present
  severity?: string
  est: duration             # e.g. 45m, 2h
  cognitive_load: deep|normal|shallow
  status: open|in_progress|blocked|done
  deps?: string[]

DaySlot:
  start: time
  end: time
  energy: high|mid|low
  bias: string              # clarify / execute / capture …

DayPlan:
  date: date
  hours_available: number
  energy_now: high|mid|low
  slots: DaySlot[]
  today: (TaskStub & { slot_start, slot_end })[]
  deferred: TaskStub[]
  overflow_note?: string    # pool does not fit today
```

#### `strict-orchestrator`

| File | Content |
|---|---|
| `strict-workflows/skills/strict-orchestrator/references/pipeline.md` | Ordered steps, skip rules, failure/partial behaviour |
| `strict-workflows/skills/strict-orchestrator/references/report-format.md` | User-facing day report sections |
| `strict-workflows/skills/strict-orchestrator/references/dispatch-plan.md` | Neutral dispatch payload for adapters |
| `strict-workflows/skills/strict-orchestrator/references/examples.md` | End-to-end golden walkthrough (fixtures, not live Orca) |

**Dispatch plan (conceptual, agent-agnostic):**

```text
DispatchPlan:
  objective: string
  tasks:
    - id: string
      title: string
      prompt: string          # self-contained worker brief
      deps: string[]
      estimated: duration
      cognitive_load: …
  gates?:                     # human checkpoints
    - after: task_id
      question: string
```

#### `strict-adapters/orca`

| File | Content |
|---|---|
| `strict-adapters/orca/references/cli-map.md` | `DispatchPlan` field → `orca orchestration …` commands |
| `strict-adapters/orca/references/install.md` | How to detect/load Orca orchestration skill; fallback message if missing |

Adapter is invoked by workflows/skills only — not by end users directly (per CLAUDE.md).

### Shared references created only on 2nd consumer

| File | Trigger | Move from |
|---|---|---|
| `strict-workday/references/energy-profile.md` | `day-plan` merged **and** `task-status` still has inline energy | Inline tables in both skills → single package ref; both SKILL.md point to it |
| `strict-foundation/references/task-stub.md` | Third package needs `TaskStub` (e.g. adapter + workday + management) | Duplicate stubs in day-plan / gantt / dispatch-plan docs |
| `strict-foundation/references/dispatch-plan.md` | Second adapter (not only Orca) | Promote from orchestrator `dispatch-plan.md` |

### Energy profile content (for the future shared ref)

Mirror current `strict-task-status` bands unless user customizes later:

| Time | Energy | Bias |
|---|---|---|
| 06:00–10:00 | low | clarify, capture, unblock |
| 10:00–15:00 | high | execute, deep progress |
| 15:00–18:00 | mid | one concrete piece |
| 18:00–06:00 | low | capture state, shallow/auto, stop clean |

Mapping for day-plan:

| Energy | Prefer `cognitive_load` |
|---|---|
| high | deep → normal |
| mid | normal → shallow |
| low | shallow only (or stop) |

---

## Composition pipeline (`strict-orchestrator`)

```text
1. Resolve pool
   - session / tracker / user list (max ~20–30 for one pass)
2. Goals present?
   - else suggest /strict-goals or proceed with impact prompts
3. Score missing items
   - /strict-impact --fast per unscored (or batch instruction in workflow body)
4. Enrich stubs
   - est + cognitive_load (from context, scoring ease, or ask once per unknown)
5. /strict-day-plan
   - hours_available + local time + pool → DayPlan
6. /strict-gantt
   - DayPlan.today (+ optional deferred as later section) → Mermaid
7. Report
   - Pool status table
   - Today recommendations
   - Gantt
   - Deferred / overflow
8. Optional dispatch
   - Build DispatchPlan from Today (or user-selected subset)
   - Hand to adapter if runtime present; else print plan only
```

Partial success: if scoring fails for some items, plan with unscored marked; never block the whole day report.

---

## Session / worktree matrix

Use one worktree per row. Merge order = dependency order.

| # | Branch | Scope | Creates | Depends on | Marketplace |
|---|---|---|---|---|---|
| 1 | `feat/strict-gantt` | atomic | `strict-management/skills/strict-gantt/**` | — | add `strict-management` to marketplace when first skill lands |
| 2 | `feat/strict-day-plan` | atomic | `strict-workday/skills/strict-day-plan/**` | — (energy inline OK) | workday already listed |
| 3 | `chore/energy-profile-ref` | extract | `strict-workday/references/energy-profile.md` + thin edits to `task-status` + `day-plan` | #1 optional, **#2 merged** | none |
| 4 | `feat/strict-orchestrator-workflow` | workflow | `strict-workflows/skills/strict-orchestrator/**` | #1, #2 (impact/goals already exist) | add `strict-workflows` to marketplace |
| 5 | `feat/adapter-orca` | adapter | `strict-adapters/orca/**` | #4 stable contract | add `strict-adapters` when first adapter ships |

**Do not combine #2 and #3 in one session** if both change energy behaviour — unless #3 is literally “move identical text to a file” with no behaviour change (then allowed as mechanical extract).

**Planning branch** `feat/strict-orchestrator` may hold only this spec (and later index updates). Implementation skills land on the branches above.

### Per-session brief template

Give each worktree agent:

1. Skill name + package path  
2. One-sentence job  
3. Forbidden responsibilities (table above)  
4. Reference files to create (list)  
5. Input/output contract summary  
6. Link to this spec: `docs/superpowers/specs/2026-07-30-strict-orchestrator-design.md`  
7. Done when: SKILL.md + references + one golden example; plugin/marketplace sync if package newly gains skills  
8. Commit message scope = package name (`feat(strict-management): …`)

---

## Invocation sketch (non-normative until SKILL written)

```text
/strict-gantt [items or path to day-plan]
/strict-day-plan [pool] [--hours N]
/strict-orchestrator [pool] [--hours N] [--dispatch] [--runtime orca]
```

Flags are illustrative; finalize inside each skill’s session.

---

## Repo guardrails checklist (each PR)

- [ ] Skill in correct package per CLAUDE.md  
- [ ] No new top-level package  
- [ ] After add/remove skills: sync `.claude-plugin/marketplace.json` + README availability note  
- [ ] Adapter not user-invoked  
- [ ] Workflow only composes; formulas/visual rules stay in atomics  
- [ ] Extract shared ref only when 2+ consumers exist  

---

## Out of scope (this stack)

- Replacing Orca / building a custom multi-agent runtime  
- Automatic Jira sync as a required dependency (optional evidence only)  
- Changing scoring method math inside impact  
- Mobile/UI dashboard — markdown + Mermaid is the visual  

---

## Decision log

| Decision | Choice | Why |
|---|---|---|
| Package for Gantt | `strict-management` | Visualization of plan/rollout, not daily rhythm |
| Package for day-plan | `strict-workday` | Personal day / energy / hours left |
| Package for composition | `strict-workflows` | Strategy over atomics |
| New `strict-orchestrator` package? | No | Feature name ≠ package; avoid top-level sprawl |
| Energy as skill now? | No | Extract reference at 2nd consumer; skill only if setup needed |
| Agent-agnostic | Neutral DayPlan + DispatchPlan + Mermaid | Orca is one adapter |
| Session granularity | 1 logical skill (or one extract) per worktree | Atomic PRs, parallel worktrees |
