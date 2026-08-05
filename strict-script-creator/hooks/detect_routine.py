#!/usr/bin/env python3
"""Advisory UserPromptSubmit hook: notices a turn heavy with executed commands and
points at /strict-script-creator. Never blocks, never writes."""

import json
import os
import sys

TAIL = 200
TAIL_BYTES = 512 * 1024
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


def read_tail(path):
    """The end of the transcript. A long session runs to megabytes and only the
    last few hundred lines can hold this turn."""
    with open(path, "rb") as handle:
        handle.seek(0, os.SEEK_END)
        handle.seek(max(0, handle.tell() - TAIL_BYTES))
        # The first line is cut mid-record whenever the seek landed inside one; it
        # fails to parse and is dropped with any other malformed line.
        return handle.read().decode("utf-8", "replace")


def main():
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        return
    if not isinstance(payload, dict):
        return

    try:
        transcript = read_tail(payload.get("transcript_path") or "")
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
    try:
        # Windows consoles default to a legacy code page, and an em dash raises there.
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass
    main()
