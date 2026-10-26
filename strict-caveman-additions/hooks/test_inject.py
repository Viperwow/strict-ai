#!/usr/bin/env python3
"""Run: python3 strict-caveman-additions/hooks/test_inject.py"""

import os
import subprocess
import sys
import tempfile
from unittest import mock

import inject
from inject import REFERENCES, body, reminder, rules

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "inject.py")


def run(mode):
    env = dict(os.environ, PYTHONIOENCODING="cp1252")
    return subprocess.run([sys.executable, SCRIPT, mode], input=b"", capture_output=True, env=env)


text = rules()
assert not text.startswith("---"), "frontmatter leaked"
assert "disable-model-invocation" not in text, "frontmatter leaked"
assert "8.2.5.1" in text, "ru.md missing"
assert "-ing" in text, "en.md missing"
assert "six sentences" in text, "SKILL.md missing"

assert "\n" not in reminder().strip(), "reminder must be one line"

session = run("session")
assert session.returncode == 0, session.stderr
assert "8.2.5.1" in session.stdout.decode("utf-8"), "Cyrillic output broken on legacy code page"

prompt = run("prompt")
assert prompt.returncode == 0, prompt.stderr
assert len(prompt.stdout.decode("utf-8").strip().splitlines()) == 1

assert "https://" not in text, "link lines cost tokens every session"

assert body("---\na: 1\n---\nx\n\n---\n\ny") == "x\n\n---\n\ny", "horizontal rule in body must survive"

unknown = run("sesion")
assert unknown.returncode != 0 and unknown.stdout == b"", "unknown mode must fail loudly"

with tempfile.TemporaryDirectory() as tmp:
    broken = os.path.join(tmp, "broken.md")
    with open(broken, "wb") as handle:
        handle.write(b"\xff\xfe not utf-8")
    with mock.patch.object(inject, "REFERENCES", [os.path.join(tmp, "missing.md"), broken, REFERENCES[1]]):
        partial = rules()
assert "8.2.5.1" in partial and "six sentences" in partial, "missing or broken reference must not drop the rest"
assert "-ing" not in partial

print("ok")
