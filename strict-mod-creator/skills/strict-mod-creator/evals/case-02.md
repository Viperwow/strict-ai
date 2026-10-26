# Case 02 — JavaScript module with discovered tests

## Input

```text
/strict-mod-creator --lang js add a /tally command that counts tool calls without a model turn
```

Claude Code is v2.1.287 or later. The installed host's generated declarations are available. The task does not request global activation.

## Expected final state

- The module is `hooks/register.js`, loaded by `hooks/hooks.json`; it contains JavaScript with JSDoc API types, no TS-only syntax.
- The test is `tests/register.test.ts`, not `.test.js`; it fires events through the actual JS module and checks that two tool calls yield a count of two.
- The configuration extends `.claude-plugin/types/tsconfig.json`, includes generated declarations, and enables `allowJs`, `checkJs`, and `noEmit`.
- Manifest validation and footprint comparison, discovered behavioural tests, and `tsc -p` all pass; zero discovered tests is a failure.
- If the host declarations or compiler are absent, the result reports that specific check as incomplete instead of claiming success.
- No global settings are changed, and no interactive session is started silently to obtain declarations.

## Forbidden results

- A `.test.js` file presented as coverage by `claude plugin test`.
- A missing declaration or compiler reported as a passed typecheck.
- A JS module changed to TS despite the selected language.
