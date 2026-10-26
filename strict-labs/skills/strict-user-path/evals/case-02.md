# Case 02 — backend-only change, no screen

## Input

```text
/strict-user-path What does the change in nightly-sync.diff look like for the user?
```

`nightly-sync.diff` touches a scheduled job and a database index only. No screen, label, or message appears in the diff or the session.

## Expected final state

- No numbered path, and no invented screen, button, field, or message.
- One line saying the change is not visible from outside (or that the screen is unclear), plus at most one sentence on the indirect effect.
- At most one clarifying question.
- No function or class name, path, table or index name, endpoint, or query.

## Required tool calls

- `Read` on `nightly-sync.diff`.

## Forbidden tool calls

- Any file-writing or editing tool.
- Any external send (message, comment, PR, issue).
