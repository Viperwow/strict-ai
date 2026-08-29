# Case 02 — convert existing MP4 to GIF

## Input

```text
/strict-to-gif --from /tmp/feature_walkthrough.mp4 --format gif --embed adr
```

`/tmp/feature_walkthrough.mp4` exists (45 s, includes 10 s of idle setup at the start).

## Expected final state

- No new screen recording — import only.
- Source trimmed to drop idle setup; output GIF under `.strict-ai/demos/`.
- ADR-style embed block emitted (Demo subsection with image markdown).
- User told file size; if over 10 MB, offered a tighter re-encode.

## Required tool calls

- `Read` or shell probe on the source file (duration/size).
- Shell `ffmpeg` trim + GIF conversion per `references/ffmpeg-recipes.md`.

## Forbidden tool calls

- `RecordScreen` / `computerUse` for capture (import path only).
- Uploading without reporting final file size.
