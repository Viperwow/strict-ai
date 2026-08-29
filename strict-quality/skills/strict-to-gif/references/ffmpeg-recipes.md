# ffmpeg recipes

Read config defaults from `strict-to-gif` in `.strict-ai/configs/strict-quality.json` when present. Substitute `$IN`, `$OUT`, `$FROM`, `$TO`, `$WIDTH`, `$FPS`.

## Trim source

```bash
ffmpeg -y -ss "$FROM" -to "$TO" -i "$IN" -c copy "$OUT".trim.mp4
```

Re-encode when `-c copy` lands on a non-keyframe:

```bash
ffmpeg -y -ss "$FROM" -to "$TO" -i "$IN" -c:v libx264 -crf 23 -an "$OUT".trim.mp4
```

## MP4 for PR (compress in place)

```bash
ffmpeg -y -i "$IN" -vf "scale='min($WIDTH,iw)':-2" -c:v libx264 -crf 28 -preset slow -movflags +faststart -an "$OUT"
```

## GIF (palette, size-aware)

Two-pass — best color for UI captures:

```bash
ffmpeg -y -i "$IN" -vf "fps=$FPS,scale='min($WIDTH,iw)':-2:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" -loop 0 "$OUT"
```

Single-pass — faster, slightly worse color:

```bash
ffmpeg -y -i "$IN" -vf "fps=$FPS,scale='min($WIDTH,iw)':-2:flags=lanczos" -loop 0 "$OUT"
```

## Shrink an oversized GIF

Lower FPS and width, then re-run palette pass:

```bash
FPS=8 WIDTH=640
```

If still over `maxFileSizeMb`, shorten the trim window before lowering quality further.

## Probe before/after

```bash
ffprobe -v error -show_entries format=duration,size -of default=nw=1 "$FILE"
```

Report duration (seconds) and size (MB) in the skill output.
