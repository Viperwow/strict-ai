# How should Cursor Automations be documented inside a skills marketplace repo?

- **id:** r-001
- **date:** 2026-07-31
- **status:** answered
- **sources:** 4 primary · 2 secondary

## Verdict

Keep the **canonical prompt + run contract in-repo** next to the skill (`references/automation-prompt.md`), keep **schedule/tools/identity only in the Cursor Automations UI**, and use **automation Memories** for cross-run state that should not be PR-reviewed. A thin `docs/research/` (or similar) index is enough for humans; do not duplicate the live cron config into markdown.

## Findings

1. **Automations are UI-configured, not repo-declared.** Official docs say create at cursor.com/automations, Agents Window, `/automate`, or Marketplace templates — there is no checked-in automation manifest format. Source: https://cursor.com/docs/cloud-agent/automations
2. **Prompts should be written like cloud-agent instructions** — specific checks, tool references, decision rules (PR vs comment vs no-op), and an explicit output format. That content is what belongs under a skill `references/` file so the UI prompt stays a short pointer or a paste of the same block. Source: https://cursor.com/docs/cloud-agent/automations (Writing prompts)
3. **Skills are the repeatable procedure layer.** Cursor loads `SKILL.md` from `.cursor/skills/`, `.claude/skills/`, and plugin layouts; automations then invoke that procedure. Documenting overnight behavior as a skill (`--run` mode) keeps Claude Code plugins and Cursor Automations aligned. Source: https://cursor.com/help/customization/skills
4. **Memories persist outside the working tree** (`MEMORIES.md` by default). Use them for audit notes and “already researched” digests; use committed queue/report files when humans must review or version the work. Source: https://cursor.com/docs/cloud-agent/automations (Memories)
5. **Operational guidance (secondary):** prove the workflow once manually, then promote via `/automate`; start with a narrow schedule; review early runs for memory drift. Source: https://www.learncursor.dev/guides/cursor-automations

## Implications for this repo

- Store paste-ready prompts under `strict-*/skills/<skill>/references/automation-prompt.md` (done for overnight research).
- Keep data the automation mutates in-repo when a PR is desired (`docs/research/queue.md` + `results/`).
- Do **not** invent a `.cursor/automations.json` — Cursor does not consume one.
- Link companion automations by name/id in the prompt reference (e.g. Overnight improvements brainstorm) so operators know the fleet split.
- Optional later: a one-page `docs/automations/README.md` listing automation name → skill → schedule owner — only if a second overnight automation ships.

## Open questions

- Whether `/automate` can be pointed at an in-repo prompt file as the source of truth, or only accepts chat description (worth a follow-up when Cursor documents that path).

## Sources

| # | Type | Ref |
|---|---|---|
| 1 | primary | https://cursor.com/docs/cloud-agent/automations |
| 2 | primary | https://cursor.com/help/customization/skills |
| 3 | primary | https://cursor.com/docs/cloud-agent (cloud agents overview) |
| 4 | primary | CLAUDE.md — skill authoring + package routing |
| 5 | secondary | https://www.learncursor.dev/guides/cursor-automations |
| 6 | secondary | Existing automation `4d46d620-860b-11f1-a7d1-d6b4613131ce` (Overnight improvements brainstorm) behavior |
