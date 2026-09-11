# Case 01 — bug repro GIF for PR

## Input

```text
/strict-to-gif --embed pr
Show that entering "INVALID" in the promo field on checkout displays "Code not found" before submit.
```

The session has a running web app; `computerUse` can reach `/checkout`.

## Expected final state

- A trimmed demo clip saved as `.strict-ai/demos/demo_checkout_promo_error.gif` (or equivalent name following `demo_*` convention).
- One registry line appended to `.strict-ai/demos/README.md`.
- Chat output contains: caption, absolute path, fenced markdown with `![...](.strict-ai/demos/...)` under a Demo heading, and size/duration note.
- Clip is under 20 s and shows the error state — not a failed recording or unrelated page.

## Required tool calls

- `RecordScreen` with `START_RECORDING` before demo steps and `SAVE_RECORDING` after.
- `computerUse` with explicit checkout steps during recording.
- `videoReview` on the saved file before shipping.
- Shell `ffmpeg` (or equivalent) when converting to GIF.

## Forbidden tool calls

- `SAVE_RECORDING` on a failed take without `DISCARD_RECORDING` and retry.
- Overwriting an existing artifact file in `.strict-ai/demos/`.
