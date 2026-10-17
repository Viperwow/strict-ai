# strict-caveman-additions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an always-on package that adds paragraph, warning, English verb-form, and Russian УТР rules on top of the compression mode.

**Architecture:** Rules live in `SKILL.md` (common) and `references/{en,ru}.md` (per language). One Python hook script prints them at session start and prints a one-line reminder on every prompt. The model never invokes the skill.

**Tech Stack:** Markdown, Python 3 stdlib hook (same pattern as `strict-script-creator/hooks/`), JSON manifests.

**Spec:** `docs/superpowers/specs/2026-10-15-strict-caveman-additions-design.md`

## Global Constraints

- Package and skill name: `strict-caveman-additions`.
- `SKILL.md` frontmatter: `name: strict-caveman-additions`, `disable-model-invocation: true`, a `description` of positive intent.
- `SKILL.md` is vendor-neutral and names no other skill.
- The compression mode wins every conflict, in every language.
- Rules are restated in own words with clause numbers; no copied standard text.
- Paragraphs: one topic, at most six sentences. Warnings: a command first, then a short reason.
- English: simple present, simple past, simple future; no `-ing` form as a noun or to start a clause.
- Russian: the ten rows of the spec's `references/ru.md` table.
- Hook output uses UTF-8 on Windows consoles.
- Commits: Conventional Commits, lowercase, ≤ 100 chars, no AI trailers.

## Review Focus

1. Hook run on Windows with a legacy console code page — Cyrillic prints without `UnicodeEncodeError`. Pinned in Task 2.
2. Hook run with empty or invalid stdin — still prints the rules; exits 0. Pinned in Task 2.
3. `SKILL.md` frontmatter leaks into the injected text — must not. Pinned in Task 2.
4. A reference file missing — the hook prints what exists and exits 0. Pinned in Task 2.
5. Reply that would grow longer than the compression mode alone — the case states the length bound. Pinned in Task 1.

---

### Task 1: Rules and eval cases

**Files:**
- Create: `strict-caveman-additions/skills/strict-caveman-additions/evals/case-01.md` (Russian reply)
- Create: `strict-caveman-additions/skills/strict-caveman-additions/evals/case-02.md` (English reply)
- Create: `strict-caveman-additions/skills/strict-caveman-additions/SKILL.md`
- Create: `strict-caveman-additions/skills/strict-caveman-additions/references/ru.md`
- Create: `strict-caveman-additions/skills/strict-caveman-additions/references/en.md`
- Create: `strict-caveman-additions/skills/strict-caveman-additions/references/host-bindings.md`

**Interfaces:**
- Produces: the three rule files Task 2's hook prints.

- [ ] **Step 1: Write case-01 and case-02** in the format of `strict-workday/skills/strict-leftovers/evals/case-01.md`. Each: a user prompt asking for a multi-paragraph explanation that includes one warning; compression mode on. Expected state: the six checks in the spec's Evals section, applied to that language.
- [ ] **Step 2: Write `SKILL.md`**: scope, precedence, paragraph rule, warning rule, exact-text rule, links to both references and host bindings in the repository link format.
- [ ] **Step 3: Write `references/ru.md`** (the ten-row table with clause numbers and the word-counting rule) and **`references/en.md`** (verb-form rule).
- [ ] **Step 4: Write `references/host-bindings.md`**: one Claude Code row — events `SessionStart` and `UserPromptSubmit`, file `hooks/hooks.json`, command `python3 "${CLAUDE_PLUGIN_ROOT}/hooks/inject.py" <session|prompt>`.
- [ ] **Step 5: Walk the cases against the rule files**; every expected line must trace to a rule.
- [ ] **Step 6: Commit** `feat(strict-caveman-additions): add rules and eval cases`

### Task 2: Hook script

**Files:**
- Create: `strict-caveman-additions/hooks/test_inject.py`
- Create: `strict-caveman-additions/hooks/inject.py`
- Create: `strict-caveman-additions/hooks/hooks.json`

**Interfaces:**
- Consumes: Task 1 rule files at `../skills/strict-caveman-additions/{SKILL.md,references/en.md,references/ru.md}` relative to `hooks/`.
- Produces: `rules() -> str` and `reminder() -> str` in `inject.py`; CLI `python3 inject.py session|prompt`.

- [ ] **Step 1: Write `test_inject.py`** (plain asserts, run as a script, like `strict-script-creator/hooks/test_hooks.py`):
  - `rules()` does not start with `---` and contains no `disable-model-invocation`;
  - `rules()` contains `8.2.5.1` and `-ing` and `six sentences`;
  - `reminder()` is one line;
  - `subprocess` run of `inject.py session` with stdin `""` and env `PYTHONIOENCODING=cp1252` exits 0 and its stdout decodes as UTF-8 containing `8.2.5.1`;
  - `inject.py prompt` exits 0 and prints exactly one line;
  - with `references/en.md` temporarily renamed, `rules()` still returns `SKILL.md` and `ru.md` text.
- [ ] **Step 2: Run** `python3 strict-caveman-additions/hooks/test_inject.py` — Expected: fails on `ModuleNotFoundError: inject`.
- [ ] **Step 3: Implement `inject.py`**: `rules()` strips frontmatter from `SKILL.md`, appends each existing reference; `reminder()` returns one line naming the active rules; `main()` reads the mode from `argv[1]`, ignores stdin, reconfigures stdout to UTF-8, prints.
- [ ] **Step 4: Write `hooks.json`** with both events, `timeout` 10, as in `strict-script-creator/hooks/hooks.json`.
- [ ] **Step 5: Run** the test — Expected: `ok`, exit 0.
- [ ] **Step 6: Commit** `feat(strict-caveman-additions): add session and prompt hooks`

### Task 3: Package wiring

**Files:**
- Create: `strict-caveman-additions/.claude-plugin/plugin.json` (version `0.1.0`)
- Create: `strict-caveman-additions/README.md`
- Modify: `.claude-plugin/marketplace.json`, `README.md` (table row and availability note), `CLAUDE.md` (canonical structure and package table)

- [ ] **Step 1: Write manifest and package README**; description identical in `plugin.json` and `marketplace.json`.
- [ ] **Step 2: Update root files.**
- [ ] **Step 3: Run** `python3 scripts/check_marketplace_sync.py` — Expected: `in sync: 10 plugins with skills`. Run `claude plugin validate strict-caveman-additions` — Expected: no errors.
- [ ] **Step 4: Commit** `chore(strict-caveman-additions): wire package into marketplace`
