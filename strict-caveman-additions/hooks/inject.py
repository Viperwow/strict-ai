#!/usr/bin/env python3
"""Hook: `session` prints the rules once per session, `prompt` prints a one-line reminder."""

import os
import sys

SKILL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "skills", "strict-caveman-additions")
SKILL = os.path.join(SKILL_DIR, "SKILL.md")
REFERENCES = [os.path.join(SKILL_DIR, "references", name) for name in ("en.md", "ru.md")]


def read(path):
    try:
        with open(path, encoding="utf-8") as handle:
            return handle.read()
    except OSError:
        return ""


def body(text):
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            return text[end + 4 :].lstrip("\n")
    return text


def rules():
    parts = [body(read(SKILL))] + [read(path) for path in REFERENCES]
    return "\n\n".join(part.strip() for part in parts if part.strip())


def reminder():
    return "strict-caveman-additions active: paragraphs, warnings, English verb forms, simplified technical Russian. Compression style wins conflicts."


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "session"
    print(rules() if mode == "session" else reminder())


if __name__ == "__main__":
    try:
        # Windows consoles default to a legacy code page, and Cyrillic raises there.
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass
    main()
