#!/usr/bin/env python3
"""Advisory UserPromptSubmit hook: notices a turn heavy with executed commands and
points at /strict-script-creator. Never blocks, never writes."""

import json
import sys

TAIL = 200
THRESHOLD = 7
# A tool executes something when its input carries a payload under one of these keys.
# Matching the shape rather than the tool name keeps every runner in scope without
# naming one: a shell tool, a sandboxed evaluator, a future one that follows suit.
EXEC_INPUT_KEYS = ("command", "code", "script")


def executes(tool_input):
    if not isinstance(tool_input, dict):
        return False
    return any(
        isinstance(tool_input.get(key), str) and tool_input[key].strip()
        for key in EXEC_INPUT_KEYS
    )


def count(transcript):
    """How many commands ran since the human last spoke."""
    runs = 0
    for line in transcript.rstrip().split("\n")[-TAIL:]:
        try:
            entry = json.loads(line)
        except ValueError:
            continue
        if not isinstance(entry, dict):
            continue

        message = entry.get("message")
        content = message.get("content") if isinstance(message, dict) else None

        if entry.get("type") == "user":
            # A user entry holding only tool results is a tool return, not a person speaking.
            is_tool_result = isinstance(content, list) and all(
                isinstance(part, dict) and part.get("type") == "tool_result"
                for part in content
            )
            if not is_tool_result:
                runs = 0
            continue

        if not isinstance(content, list):
            continue
        for part in content:
            if isinstance(part, dict) and part.get("type") == "tool_use" and executes(part.get("input")):
                runs += 1
    return runs


def main():
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        return
    if not isinstance(payload, dict):
        return

    try:
        with open(payload.get("transcript_path") or "", encoding="utf-8") as handle:
            transcript = handle.read()
    except OSError:
        return

    runs = count(transcript)
    if runs < THRESHOLD:
        return
    print(
        f"{runs} commands ran this turn. If one routine repeated, run "
        "/strict-script-creator on it — the script catalog is already in context."
    )


if __name__ == "__main__":
    # Windows consoles default to a legacy code page, and an em dash raises there.
    sys.stdout.reconfigure(encoding="utf-8")
    main()
