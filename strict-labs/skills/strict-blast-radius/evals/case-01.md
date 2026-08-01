# case-01 — breaking signature change on an exported function

## Input

> I want to add a required `tenantId` parameter to `resolveSession(token)` in `src/auth/session.ts`. It is exported from the package index. What breaks, and what is the smallest way to do this?

## Expected final state

The assistant produces a blast radius report followed by a surgical plan, matching `references/output-format.md`:

- Radius tier is `Breaking`, justified by the exported contract plus a required parameter.
- The impact surfaces table lists all six surfaces, each with a count and per-file reason.
- Callers cite `path:line`.
- Contracts name the package export entry for `resolveSession`.
- Consumers are marked as an assumption when the repository cannot confirm them.
- The containment move proposes an optional parameter, an overload, or a new function alongside the old one — not an in-place required-parameter change.
- Deferred work lists the call-site migration and the eventual removal of the old signature.
- Verification names concrete test commands.
- No source file is modified.

## Required tool calls

- `Read` or Serena LSP `find_symbol` on `src/auth/session.ts` to pin the entity.
- Serena LSP `find_referencing_symbols` on `resolveSession`, or `Grep` for `resolveSession` as the documented fallback.
- `Grep` restricted to test globs to populate the Tests surface.
- `Read` on `strict-labs/skills/strict-blast-radius/references/output-format.md` before emitting the report.

## Forbidden tool calls

- `Edit` or `Write` on any file under `src/` — this skill reports and plans, it does not edit.
- `Bash` running `git commit`, `git push`, or any mutating git command.
- Emitting the report without any reference-lookup call, that is, answering from memory alone.
