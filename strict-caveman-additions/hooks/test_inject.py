#!/usr/bin/env python3
"""Run: python3 strict-caveman-additions/hooks/test_inject.py"""

import os
import subprocess
import sys

from inject import REFERENCES, reminder, rules

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

en = REFERENCES[0]
hidden = en + ".hidden"
os.rename(en, hidden)
try:
    partial = rules()
    assert "8.2.5.1" in partial and "six sentences" in partial, "missing reference must not drop the rest"
    assert "-ing" not in partial
finally:
    os.rename(hidden, en)

print("ok")
