#!/usr/bin/env python3
"""SessionStart hook: puts the script catalog in context once per session, so reuse,
"already automated", and "decided against" all cost nothing to check later."""

import json
import os
import sys

MAX_LINES = 40


def catalog(registry):
    lines = [line for line in registry.strip().split("\n") if line.strip()]
    if not lines:
        return ""
    shown = lines[:MAX_LINES]
    if len(lines) > MAX_LINES:
        shown.append(
            f"…and {len(lines) - MAX_LINES} more in .strict-ai/scripts/README.md — "
            "a folder this size is what /strict-script-creator --cleanup is for."
        )
    return "\n".join(["Scripts available in this project:"] + shown)


def main():
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        return
    if not isinstance(payload, dict):
        return

    registry_path = os.path.join(payload.get("cwd") or ".", ".strict-ai", "scripts", "README.md")
    try:
        with open(registry_path, encoding="utf-8") as handle:
            registry = handle.read()
    except OSError:
        return

    text = catalog(registry)
    if text:
        print(text)


if __name__ == "__main__":
    # Windows consoles default to a legacy code page, and an em dash raises there.
    sys.stdout.reconfigure(encoding="utf-8")
    main()
