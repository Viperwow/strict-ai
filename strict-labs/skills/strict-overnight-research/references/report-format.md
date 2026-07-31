# Report format

File: `docs/research/results/YYYY-MM-DD-<slug>.md`

`<slug>` = kebab-case of the title, max ~60 chars.

## Template

```markdown
# <Title>

- **id:** r-NNN
- **date:** YYYY-MM-DD
- **status:** answered | partial | blocked
- **sources:** N primary · M secondary

## Verdict

<2–4 sentences. Direct answer first.>

## Findings

1. **<Claim>** — <evidence>. Source: <url or path:line>
2. **<Claim>** — <evidence>. Source: <url or path:line>
3. …

## Implications for this repo

- <actionable takeaway, or "none">
- …

## Open questions

- <follow-up worth a new queue item, or "none">

## Sources

| # | Type | Ref |
|---|---|---|
| 1 | primary | url or path |
| 2 | secondary | url |
```

## Rules

1. Verdict answers the queued question; do not bury it under background.
2. Prefer primary sources. Tag blogs/tweets as secondary.
3. `partial` when evidence is incomplete but still useful; `blocked` when work could not start.
4. Implications must be concrete for `strict-ai` (skills, packages, CLAUDE.md) or explicitly `none`.
5. Keep the whole report ≤ ~150 lines unless the topic requires tables of options.
