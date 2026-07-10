# strict-changelog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `strict-changelog` agent skill that turns the current branch's commits into a keepachangelog-format changelog, scoped by conventional commits, with each change linked to its task.

**Architecture:** Pure agent skill — no runtime code. A `SKILL.md` instructs the agent through a fixed pipeline (git log → parse conventional commits → map type to section → collapse by task-id → resolve task links via available integrations → render grouped by scope). Format rules are pulled from canonical spec URLs at run time. A `references/type-map.md` holds the overridable type→section mapping. The skill lands in `strict-development`, which then gets registered in the marketplace.

**Tech Stack:** Markdown skill files (`SKILL.md`), Claude Code plugin/marketplace JSON. No test framework — validation is structural (frontmatter present, JSON parses, sections present).

## Global Constraints

- Vendor-agnostic: the skill stores nothing about any specific tracker (no baked URLs, tokens, or tracker names in logic).
- No automatic file writes: output prints to chat; file writes only on explicit user yes.
- Placement package: `strict-development`.
- Skill name: `strict-changelog`. Kebab-case, stable.
- Follow existing skill style (see `strict-labs/skills/strict-impact/SKILL.md`): frontmatter `name` + `description`, then `#` title, `## Invocation`, etc.
- After adding the skill, sync `.claude-plugin/marketplace.json` and the README availability note (repo guardrail 12).

---

### Task 1: type→section mapping reference

**Files:**
- Create: `strict-development/skills/strict-changelog/references/type-map.md`

**Interfaces:**
- Produces: the canonical type→section table that `SKILL.md` (Task 2) references by path.

- [ ] **Step 1: Create the mapping file**

Create `strict-development/skills/strict-changelog/references/type-map.md`:

```markdown
# Conventional type → keepachangelog section

Default mapping. Override by editing this table; the skill reads it as the source of truth.

| Conventional type | keepachangelog section |
|-------------------|------------------------|
| `feat`            | Added                  |
| `fix`             | Fixed                  |
| `perf`            | Changed                |
| `refactor`        | Changed                |
| `remove`          | Removed                |
| `security`        | Security               |
| `deprecate`       | Deprecated             |

## Dropped types (not user-facing — excluded from the changelog)

`docs`, `chore`, `test`, `build`, `ci`, `style`

## Rules

- A breaking change (`!` after type/scope, or `BREAKING CHANGE:` trailer) that removes
  public surface maps to **Removed**; otherwise it stays in its type's section but the
  slug is prefixed `**BREAKING** `.
- A type absent from both tables above is treated as **Changed**.
```

- [ ] **Step 2: Verify it parses as a table**

Run: `grep -c '^|' strict-development/skills/strict-changelog/references/type-map.md`
Expected: `9` (header + separator + 7 rows).

- [ ] **Step 3: Commit**

```bash
git add strict-development/skills/strict-changelog/references/type-map.md
git commit -m "feat(strict-changelog): add type-to-section mapping reference"
```

---

### Task 2: the SKILL.md

**Files:**
- Create: `strict-development/skills/strict-changelog/SKILL.md`
- Reference: `strict-development/skills/strict-changelog/references/type-map.md` (from Task 1)

**Interfaces:**
- Consumes: `references/type-map.md` for the type→section table.
- Produces: the `/strict-changelog` skill, discoverable once the plugin is registered (Task 3).

- [ ] **Step 1: Create the skill file**

Create `strict-development/skills/strict-changelog/SKILL.md`:

````markdown
---
name: strict-changelog
description: Generate a keepachangelog-format changelog from the current branch's commits over a period (default last 7 days). Scopes changes by conventional-commit type and scope, collapses commits sharing a task-id into one linked line, and flags commits with no task-id. Vendor-agnostic — resolves task links via whatever integration is available, never hardcodes a tracker. Use when asked "what changed", to prepare release notes, or a changelog. Triggers on /strict-changelog.
---

# strict-changelog

Turn the current branch's commits into a keepachangelog changelog, scoped by conventional commits, each change linked to its task.

## Invocation

~~~
/strict-changelog                    # default: last 7 days
/strict-changelog --since 2026-06-01 # from a date (inclusive)
/strict-changelog --from <commit>    # from a commit (exclusive)
~~~

`--since` and `--from` are mutually exclusive. No argument → last 7 days.

## Authoritative sources

Do not rely on memorized format. At the start of each run, fetch these and derive the
current section set and parse grammar from them:

- keepachangelog (sections, ordering): <https://keepachangelog.com/en/1.1.0/>
- conventional commits (type/scope/subject grammar): <https://www.conventionalcommits.org/en/v1.0.0/>

If a fetch fails, fall back to `references/type-map.md` and the rules below.

## Pipeline

1. **Resolve range.**
   - no arg → `git log --since="7 days ago"`
   - `--since <date>` → `git log --since="<date>"`
   - `--from <commit>` → `git log <commit>..HEAD`
   Always scope to the current branch (`HEAD`).

2. **Collect.** For each commit read subject, body, and trailers:
   `git log <range> --format='%H%x00%s%x00%b%x00%(trailers:only)%x00'`

3. **Parse conventional commit.** Split subject as `type(scope): description`.
   Non-conventional subjects have no type/scope — route to Unlinked handling.

4. **Map type → section.** Use the table in `references/type-map.md`. Dropped types
   (`docs`, `chore`, `test`, `build`, `ci`, `style`) are excluded.

5. **Resolve task-id.** Read the git **trailer** first (`Task:`, `Ref:`, `Refs:`), else
   the conventional **scope** if it holds an id. Trailer wins. No id → mark `[???]`.

6. **Collapse.** Commits sharing one task-id become **one line**. Slug from the task
   title if resolvable, else the most descriptive commit subject.

7. **Resolve link.** If an integration is available this session (an MCP or skill that
   maps a task-id to a URL), use it. Otherwise ask the user **once** for the base URL
   pattern (e.g. `https://tracker/browse/{id}`) and apply it to all ids. Store nothing.

8. **Render.** Print to chat. keepachangelog sections in canonical order; inside each
   section group lines by conventional scope (`**storage**`, `**monitoring**`, …).
   No scope → `**misc**`.

## Line format

~~~
- <slug> [<task-id as md link>]
~~~

Example: `- Streaming upload for large blobs [[PROJ-412](https://tracker/browse/PROJ-412)]`

Unlinked change (no task-id) — same shape, `[???]` in place of the link:

~~~
- Bump lint config [???]
~~~

## Unlinked handling

Commits with no resolvable task-id are kept and rendered in their normal section and
scope with `[???]`. After the main body, print a `### Unlinked` section — a plain list
of those changes, no extra prose. Then run two ordered offers, each a clean yes/no:

1. "Create tasks for the unlinked changes? (yes/no)" — first, so data can be enriched
   before it lands in a file. On yes, use an available integration to create them, then
   re-render.
2. "Write the changelog to CHANGELOG.md? (yes/no)" — on yes, prepend the rendered
   section to `CHANGELOG.md` (create the file if absent).

## Output

Print to chat only. The two offers above are the only writes, and only on explicit yes.

## Example

Input: `/strict-changelog`

Output:

~~~markdown
## [Unreleased] — 2026-07-03 … 2026-07-10

### Added
**storage**
- Streaming upload for large blobs [[PROJ-412](https://tracker/browse/PROJ-412)]
**misc**
- Retry backoff on cold start [[PROJ-419](https://tracker/browse/PROJ-419)]

### Fixed
**monitoring**
- Dropped p99 metric label [[PROJ-421](https://tracker/browse/PROJ-421)]

### Unlinked
- Bump lint config [???]
- Fix typo in readme [???]
~~~

Then:
~~~
Create tasks for the unlinked changes? (yes/no)
~~~
(after that answer)
~~~
Write the changelog to CHANGELOG.md? (yes/no)
~~~
````

- [ ] **Step 2: Verify frontmatter and required sections**

Run: `grep -E '^name: strict-changelog$|^## Invocation$|^## Pipeline$|^## Unlinked handling$|^## Example$' strict-development/skills/strict-changelog/SKILL.md | wc -l`
Expected: `5`

- [ ] **Step 3: Verify the type-map reference path resolves**

Run: `test -f strict-development/skills/strict-changelog/references/type-map.md && echo OK`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add strict-development/skills/strict-changelog/SKILL.md
git commit -m "feat(strict-changelog): add SKILL.md"
```

---

### Task 3: register strict-development in the marketplace

**Files:**
- Modify: `.claude-plugin/marketplace.json` (add `strict-development` plugin entry; bump marketplace `version`)
- Modify: `strict-development/.claude-plugin/plugin.json` (bump `version` to `0.2.0`)
- Modify: `README.md` (add `strict-development` to the availability note)

**Interfaces:**
- Consumes: the skill from Tasks 1–2 (the plugin now has content, so it becomes listable).

- [ ] **Step 1: Add the plugin entry to marketplace.json**

In `.claude-plugin/marketplace.json`, add this object to the `plugins` array (after the `strict-labs` entry):

```json
    {
      "name": "strict-development",
      "source": "./strict-development",
      "description": "Skills for engineering implementation — changelog generation, technical design, PR preparation.",
      "version": "0.2.0",
      "category": "development"
    }
```

And bump the top-level `metadata.version` from `0.5.0` to `0.6.0`.

- [ ] **Step 2: Bump the plugin version**

In `strict-development/.claude-plugin/plugin.json`, change `"version": "0.1.0"` to `"version": "0.2.0"`.

- [ ] **Step 3: Update the README availability note**

In `README.md`, change:

```
> **Available in marketplace:** `strict-workday` · `strict-labs`
```

to:

```
> **Available in marketplace:** `strict-workday` · `strict-development` · `strict-labs`
```

- [ ] **Step 4: Verify both JSON files still parse**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json')); JSON.parse(require('fs').readFileSync('strict-development/.claude-plugin/plugin.json')); console.log('OK')"`
Expected: `OK`

- [ ] **Step 5: Verify the new plugin is listed**

Run: `grep -c 'strict-development' .claude-plugin/marketplace.json`
Expected: `2` (source path + name)

- [ ] **Step 6: Commit**

```bash
git add .claude-plugin/marketplace.json strict-development/.claude-plugin/plugin.json README.md
git commit -m "feat(strict-development): register plugin with strict-changelog skill"
```

---

## Self-Review

**Spec coverage:**
- Invocation (default week, `--since`, `--from`) → Task 2 Step 1 Invocation section. ✓
- Authoritative sources / ground-from-source → Task 2 Authoritative sources + Pipeline step 1. ✓
- type→section mapping (6 sections, drop noise) → Task 1 + Task 2 step 4. ✓
- task-id resolution (trailer → scope) → Task 2 pipeline step 5. ✓
- Collapse by task-id (one task = one line) → Task 2 step 6. ✓
- Vendor-agnostic link resolution → Task 2 step 7. ✓
- Group by scope, misc fallback → Task 2 step 8. ✓
- Line format + `[???]` → Task 2 Line format. ✓
- Unlinked section + two ordered offers → Task 2 Unlinked handling. ✓
- Print-only output, file offer last → Task 2 Output + Unlinked handling. ✓
- Repo sync guardrail 12 → Task 3. ✓

**Placeholder scan:** No TBD/TODO; all file content is literal. ✓

**Type consistency:** Section names (Added/Fixed/Changed/Removed/Security/Deprecated), file paths, and the `references/type-map.md` path match across Task 1, Task 2, and the spec. ✓
