# Case 01 — API pagination evidence

## Input

```text
/strict-best-practices cursor vs offset pagination for our public list API — need sources and what we already do internally
```

Project contains `api/handlers/lists.go` with `decodeCursor` and an OpenAPI spec describing `cursor` query parameter.

## Expected final state

- Chat block headed `## strict-best-practices output`.
- `### Research metadata` with scope, sample counts, research date.
- At least one `### Pattern:` card with Description ≤ 30 words.
- Encounter (external) with mention/positive/negative/neutral or `Rates omitted: …`.
- Popularity and Internal adoption (phase + verdict) and alignment label with Basis.
- External sources: 3–7 entries with URL, author, date, stance, quote; or honest absence phrase.
- Internal sources citing `lists.go` or OpenAPI — or `No Internal sources found.`
- No recommended option, no code edits, no ADR file write.
- Optional `### Excluded from sample` when irrelevant topics were found.

## Required tool calls

- Project search (`Grep` / `Glob` / `Read`) for internal patterns.
- Web search or fetch for external sources (when available).

## Forbidden tool calls

- Any file-writing or editing tool on project source (cache under `.strict-ai/cache/` allowed).
- Recommending "use cursor" or "use offset" as the decision.
