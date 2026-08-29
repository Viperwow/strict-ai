# Embed patterns

Paths are relative to the repo root unless the doc lives elsewhere — adjust `../` as needed.

## Pull request / issue (GitHub)

```markdown
### Demo

<one-line caption>

![<alt text>](.strict-ai/demos/<file>.gif)
```

For MP4 (GitHub renders video in markdown):

```markdown
https://github.com/user-attachments/assets/<uploaded-id>
```

Prefer uploading MP4 via the PR UI when over ~10 MB; keep the repo copy under `.strict-ai/demos/` for traceability.

## ADR

Append under **Consequences** or a **Demo** subsection:

```markdown
## Demo

<one-line caption>

![<alt text>](.strict-ai/demos/<file>.gif)
```

## PRD / prototype doc

```markdown
| Flow | Demo |
|---|---|
| <user-facing name> | ![<alt text>](.strict-ai/demos/<file>.gif) |
```

Pair with **strict-user-path** steps above the table when stakeholders need both script and clip.

## Cloud Agent / Cursor run summary

Absolute path for auto-uploaded artifacts:

```html
<img alt="<alt text>" src="/opt/cursor/artifacts/<file>.gif" />
```

Or video:

```html
<video src="/opt/cursor/artifacts/<file>.mp4" controls></video>
```

## Alt text

Describe the **outcome**, not the recording process.

- Good: `Checkout shows "Code not found" under the promo field`
- Bad: `Screen recording of me testing checkout`
