# Recording bindings

Vendor-neutral mechanics live here. `SKILL.md` stays host-agnostic.

| Host capability | Start | Stop / save | Notes |
|---|---|---|---|
| `RecordScreen` tool | `mode: START_RECORDING` | `SAVE_RECORDING` + `save_as_filename` | Cloud Agent; writes under `/opt/cursor/artifacts/` |
| `RecordScreen` tool | — | `DISCARD_RECORDING` | On failed take |
| `computerUse` subagent | invoke with step list | returns when steps done | Run **during** recording, not before |
| `videoReview` subagent | pass saved video path | — | Required before user-facing ship |
| macOS (human) | ⌃⌘5 → Record Selected Portion | stop from menu bar | Tell user to save `.mov` path |
| Windows (human) | Win+G → Capture | stop from widget | `.mp4` in Videos/Captures |
| Linux (human) | distro screen recorder or `wf-recorder` | — | Prefer `.mp4` or `.webm` import |

## Agent sequence (canonical)

```text
setup UI → START_RECORDING → computerUse(steps) → SAVE_RECORDING → videoReview → ffmpeg → .strict-ai/demos/
```

Do not leave recording running across setup, debug, or unrelated navigation.
