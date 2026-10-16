# strict-leftovers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `strict-leftovers`, a skill that keeps a verbatim journal of a task's open questions, findings, and decisions, ordered so the list shrinks every pass.

**Architecture:** One `SKILL.md` holds behavior, parameters, ordering, and the Done rule. One reference file holds the journal format and the severity table. Evals come first: a trigger set and two behavior cases define "working" before the skill text exists.

**Tech Stack:** Markdown skill (Agent Skills `SKILL.md`), JSON trigger eval, Python guardrail script already in the repo.

**Spec:** `docs/superpowers/specs/2026-10-15-strict-leftovers-design.md`

## Global Constraints

- Package `strict-workday`; skill directory `strict-workday/skills/strict-leftovers/`.
- `SKILL.md` stays vendor-neutral: no host name, no client-specific phrasing.
- No skill references or invokes another skill.
- `description` holds positive user intent only, under 1024 characters, ends with `Triggers on /strict-leftovers.`
- Chat output header: `## strict-leftovers output`.
- Journal: `.strict-ai/leftovers/<task-id>.md`; registry `.strict-ai/leftovers/README.md`.
- Config: `.strict-ai/configs/strict-workday.json`, key `strict-leftovers`, fields `driftDepth` = `3`, `stallRuns` = `3`. No file ships.
- Quotes are verbatim and never rewritten. Entries are never deleted.
- Done per requirement: no open `blocker`/`critical`/`high` in the subtree, and every depth-1 entry `decided`. No percentage threshold.
- File links: path as text, `https://github.com/Viperwow/strict-ai/blob/main/<path>` as target.
- Commits: Conventional Commits, lowercase subject, header ≤ 100 chars, no AI attribution trailers.

## Review Focus

1. A session with no stated requirement — the task title becomes `R-1`; nothing crashes into "all detached". Pinned in Task 2, case-01.
2. The same question raised twice in different words — one entry with `also:`, `Open` does not grow. Pinned in Task 2, case-01.
3. A reviewer labels a cosmetic issue `critical` — the skill assigns `low`, keeps `stated: critical`, the gate does not block. Pinned in Task 2, case-02.
4. A source the agent cannot reach (no tracker, no messenger) — one absence line, run continues. Pinned in Task 2, case-02.
5. A detached entry later linked by the user — moves to `Open` with parent and depth, quote unchanged. Pinned in Task 2, case-02.

---

### Task 1: Trigger eval set

**Files:**
- Create: `docs/superpowers/evals/strict-leftovers-trigger-eval.json`

**Interfaces:**
- Produces: the trigger set Task 3's `description` must satisfy.

- [ ] **Step 1: Write 20 queries**

Same schema as `docs/superpowers/evals/strict-best-practices-trigger-eval.json`: `{ "query", "should_trigger", "split" }`. 12 `train`, 8 `validation`. 10 should trigger, 10 should not.

Should trigger, examples to cover: `/strict-leftovers`; "what's left on this task"; "write down what we decided so far"; "we keep drifting, show what pulled in what"; "review dumped 30 comments, log them against the requirements"; "is PROJ-123 done yet"; Russian phrasing "что осталось по задаче".

Should not trigger, near misses: "fix this failing test"; "estimate this epic"; "write the Definition of Done for a new task"; "summarize this Slack thread"; "status of the sprint"; "create a Jira ticket for this bug".

- [ ] **Step 2: Validate JSON**

Run: `python -I -c "import json,collections;d=json.load(open('docs/superpowers/evals/strict-leftovers-trigger-eval.json',encoding='utf-8'));print(len(d),collections.Counter(x['split'] for x in d),collections.Counter(x['should_trigger'] for x in d))"`
Expected: `20 Counter({'train': 12, 'validation': 8}) Counter({True: 10, False: 10})`

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/evals/strict-leftovers-trigger-eval.json
git commit -m "test(strict-workday): add strict-leftovers trigger eval set"
```

### Task 2: Behavior eval cases

**Files:**
- Create: `strict-workday/skills/strict-leftovers/evals/case-01.md`
- Create: `strict-workday/skills/strict-leftovers/evals/case-02.md`

**Interfaces:**
- Produces: the expected final states Task 3's `SKILL.md` must reach.

Format follows `strict-mod-creator/skills/strict-mod-creator/evals/case-01.md`: `## Input`, `## Expected final state`, `## Required tool calls`, `## Forbidden tool calls`.

- [ ] **Step 1: Write case-01 — first run**

Input: `/strict-leftovers` on branch `feat/table-pencil-icons`. Session: user asks to replace `set…` actions with pencil icons; no DoD stated; agent raises "button management also differs" twice in different words; user says "would be cool to annotate video frames"; user decides "pencils everywhere, no exceptions".

Expected final state must assert:
- journal `.strict-ai/leftovers/feat-table-pencil-icons.md` exists with header `last-run`, `open-count`;
- `R-1` is the task title, verbatim;
- the button question is one entry with one `also:` line, both quotes verbatim;
- the pencil decision is under `Decided`, verbatim, status `decided`;
- the video remark is under `Detached`, `by: user`;
- the graph block contains `R1` and an unconnected `L` node for the detached entry;
- chat output starts with `## strict-leftovers output`, then one counts line, then only `Open` items;
- registry `.strict-ai/leftovers/README.md` gains one line.

Forbidden: rewording any quote; printing `Decided`, `Later`, or `Detached` items in chat.

- [ ] **Step 2: Write case-02 — later run, gate, stall, follow-ups**

Input: second and later `/strict-leftovers` runs on the case-01 journal. Review adds a comment labelled `critical` that is only a naming nit; review adds a real regression on another button; no tracker is reachable; user links the video remark to `R-1`; `open-count` did not shrink for 3 runs.

Expected final state must assert:
- naming nit: `severity: low`, `stated: critical`, does not block the gate;
- regression: `severity: critical`, first in `Open`;
- one line `Tracker data is unavailable.`; run completes;
- the video entry moved to `Open` with `from: R-1` and a depth, quote unchanged;
- first output line reports the stall, then lists `Open` entries at depth ≥ 3 and proposes `Later`; nothing moved without the user;
- after the regression is decided and depth-1 entries are decided: `R-1 · gate ok · n/n · done`; remaining entries move to `Follow-ups`, each root listed as a ticket candidate.

Forbidden: deleting an entry; creating a tracker ticket.

- [ ] **Step 3: Commit**

```bash
git add strict-workday/skills/strict-leftovers/evals
git commit -m "test(strict-workday): add strict-leftovers behavior cases"
```

### Task 3: Skill and journal reference

**Files:**
- Create: `strict-workday/skills/strict-leftovers/SKILL.md`
- Create: `strict-workday/skills/strict-leftovers/references/journal-format.md`
- Create: `strict-workday/skills/strict-leftovers/references/host-bindings.md`

**Interfaces:**
- Consumes: Task 1 trigger set, Task 2 cases.

- [ ] **Step 0: Write `references/host-bindings.md`**

A table, one row per host: host, transcript location, session memory store. Claude Code row: transcript `~/.claude/projects/<project-slug>/<session-id>.jsonl` (project slug = working directory with `:`, `\`, `/` replaced by `-`; newest file when the session id is unknown); memory store `context-mode` (`ctx_search`), when installed.

- [ ] **Step 1: Write `references/journal-format.md`**

Copy from the spec: the journal template, the entry-field table (with `stated`), the severity table and its tie rule, the graph rules. Nothing else.

- [ ] **Step 2: Write `SKILL.md`**

Frontmatter `name: strict-leftovers` and a `description` meeting the Global Constraints. Body sections, each taken from the spec without restating the reference file:
- Invocation: `/strict-leftovers [task-id]`; parameters `--all` (print every section) and `--graph` (print the graph in chat); task-id resolution order.
- Artifacts and config (paths and defaults from Global Constraints).
- Sources and absence line.
- Behavior steps 1–9, with the spec's "Resolved calls" folded in: requirements, DoD copy, cursor, duplicates, parent, moves, delta, Done inputs.
- Ordering keys 1–5 and drift tag.
- Stall rule.
- Done: per requirement, per task, Follow-ups.
- Chat output.
- Link to the reference as `[references/journal-format.md](https://github.com/Viperwow/strict-ai/blob/main/strict-workday/skills/strict-leftovers/references/journal-format.md)`.

- [ ] **Step 3: Check description length and wording**

Run: `python -I -c "import re;t=open('strict-workday/skills/strict-leftovers/SKILL.md',encoding='utf-8').read();d=re.search(r'^description: (.*)$',t,re.M).group(1);print(len(d),d.endswith('Triggers on /strict-leftovers.'))"`
Expected: a number below `1024`, then `True`.

- [ ] **Step 4: Walk the evals**

Read case-01, case-02, and the trigger set against `SKILL.md`. Each expected-state line must trace to a sentence in `SKILL.md` or the reference. Each should-trigger query must match the `description` intent; each should-not query must fall outside it. Fix the skill text, not the cases.

- [ ] **Step 5: Commit**

```bash
git add strict-workday/skills/strict-leftovers
git commit -m "feat(strict-workday): add strict-leftovers skill"
```

### Task 4: Plugin wiring

**Files:**
- Modify: `strict-workday/.claude-plugin/plugin.json` — `version` `0.4.1` → `0.5.0`
- Modify: `README.md` — only if it lists `strict-workday` skills by name; add `strict-leftovers` beside them

- [ ] **Step 1: Bump version and update README if needed**

- [ ] **Step 2: Run the guardrail check**

Run: `python -I scripts/check_marketplace_sync.py`
Expected: exit code `0`, no drift reported.

- [ ] **Step 3: Commit**

```bash
git add strict-workday/.claude-plugin/plugin.json README.md
git commit -m "chore(strict-workday): release strict-leftovers in 0.5.0"
```
