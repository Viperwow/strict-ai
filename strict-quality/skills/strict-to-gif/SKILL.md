---
name: strict-to-gif
description: Create a short GIF or screen recording that shows a bug reproduction, feature flow, or task outcome for PRs, ADRs, PRDs, and prototypes. Use when the user wants a visual demo, walkthrough clip, or asks to capture on-screen evidence. Triggers on /strict-to-gif.
---

# strict-to-gif

Turn an on-screen flow into a shareable demo clip — GIF for lightweight embeds, MP4 when motion or length matters more than size.

## Invocation

```text
/strict-to-gif                         # subject = current task, bug, or feature in session
/strict-to-gif <what to show>          # explicit subject
/strict-to-gif --format gif|mp4        # force output format (default: gif)
/strict-to-gif --embed pr|adr|prd      # also emit ready-to-paste markdown for that doc type
/strict-to-gif --from <path-or-url>    # convert an existing recording instead of capturing new
```

`--format` and `--from` combine. `--embed` can combine with any path.

## When to use

| Situation | Default format | Why |
|---|---|---|
| Bug reproduction for a PR or issue | GIF | Loops in markdown, no player chrome |
| Before/after UI change | GIF or 2 GIFs | Side-by-side or sequential stills + one clip |
| Feature walkthrough under ~20 s | GIF | Fits PR description and ADR appendix |
| Longer flow, audio, or fine detail | MP4 | Quality over embed weight |
| PRD / prototype review | GIF | Stakeholders skim without clicking play |
| Agent proof-of-work after a fix | MP4 first | Cloud agents already record MP4 — convert if PR needs GIF |

If the session is a Cloud Agent finishing tested work, read `walkthrough-artifacts` first. Use this skill when the deliverable is a **shareable demo artifact** (PR, doc, issue), not only run evidence.

## Artifacts

Written in the target project on first use:

```text
.strict-ai/demos/
  README.md              # one line per demo artifact
  <name>.gif | .mp4      # the clips
```

Cloud Agent runs without a project checkout may write to `/opt/cursor/artifacts/` instead; naming rules are the same.

### Naming

`demo_<subject>_<variant>.<ext>` — snake_case, short, descriptive.

Examples: `demo_login_invalid_code.gif`, `demo_checkout_promo_before.mp4`, `demo_sync_retry_fixed.gif`

Never overwrite an existing artifact. Add a suffix (`_v2`, `_retake`) when re-recording.

## Pipeline

| Step | You do | Gate |
|---|---|---|
| 1 | State the demo goal in one sentence: what the viewer must see and conclude | — |
| 2 | Pick format (table above) and target embed (`pr`, `adr`, `prd`, or chat only) | — |
| 3 | **Capture** or **import** source video | see Recording |
| 4 | Trim to the shortest clip that still proves the point | drop setup, idle, and debug |
| 5 | **Convert** (GIF) or **compress** (MP4) | see [references/ffmpeg-recipes.md](https://github.com/Viperwow/strict-ai/blob/main/strict-quality/skills/strict-to-gif/references/ffmpeg-recipes.md) |
| 6 | Save under `.strict-ai/demos/` (or artifacts dir) | — |
| 7 | Append one line to `README.md` | create file if absent |
| 8 | Emit embed markdown when `--embed` or user asked for PR/doc paste | see [references/embed-patterns.md](https://github.com/Viperwow/strict-ai/blob/main/strict-quality/skills/strict-to-gif/references/embed-patterns.md) |

**Step 4 rule:** one clip = one claim. Bug repro is one broken path; fix demo is one working path. Split instead of one long tour.

## Recording

Full binding table (which tool, which host): [references/recording-bindings.md](https://github.com/Viperwow/strict-ai/blob/main/strict-quality/skills/strict-to-gif/references/recording-bindings.md).

### Agent with screen access

1. Open the UI to the starting state (`computerUse` or equivalent).
2. `RecordScreen` → `START_RECORDING`.
3. Perform only the demo steps (via `computerUse` with explicit step list).
4. `RecordScreen` → `SAVE_RECORDING` with a `demo_*` filename, or `DISCARD_RECORDING` on failure and retry.
5. Run `videoReview` on the saved file before shipping — confirm the clip shows the claim.

### Human at the keyboard

Give the shortest path for their OS (shortcut or built-in recorder). Ask them to drop the file path when done, then continue from pipeline step 4.

### Import (`--from`)

Skip capture. Accept a local `.mp4`, `.webm`, or `.mov`. Remote URLs: download once, then treat as local.

## Output

Always return, in order:

1. **Caption** — one line for PR/issue: what the clip shows.
2. **File** — absolute path to the artifact.
3. **Embed** — fenced markdown block when `--embed` or when the user will paste into GitHub/docs.
4. **Size note** — file size; if over 10 MB, say so and offer a tighter re-encode (see references).

Example:

```markdown
**Demo:** Invalid promo code shows inline error before submit.

![Invalid promo code error](.strict-ai/demos/demo_checkout_promo_error.gif)

_2.1 MB · 8 s · 800 px wide_
```

## Quality bar

Good demo clips:

- Start on the relevant screen, not desktop or unrelated tabs
- Show cursor or focus on the control that matters
- End on the outcome (error toast, success state, diff applied)
- Stay under ~20 s and ~10 MB when destined for a PR

Bad clips — discard and re-record:

- Failed attempt, half-loaded page, or wrong environment
- Long dev setup, terminal install, or unrelated navigation
- Multiple unrelated claims in one file

## Configuration

`.strict-ai/configs/strict-quality.json`:

```json
{
  "strict-to-gif": {
    "defaultFormat": "gif",
    "maxDurationSec": 20,
    "maxWidthPx": 800,
    "gifFps": 10,
    "maxFileSizeMb": 10
  }
}
```

Absent file or key → use defaults above.

## Related skills

- **walkthrough-artifacts** — Cloud Agent run evidence; convert output here when the PR needs a GIF.
- **strict-user-path** — write the numbered user steps; record those steps as the demo script.
- **strict-script-creator** — if `to-gif` conversion runs more than twice in the project, script the ffmpeg recipe.
