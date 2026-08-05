#!/usr/bin/env python3
"""Run: python3 strict-script-creator/hooks/test_hooks.py"""

import json
import os
import subprocess
import sys
import tempfile

from detect_routine import THRESHOLD, count
from load_catalog import catalog


def call(name, tool_input):
    return json.dumps(
        {"type": "assistant", "message": {"content": [{"type": "tool_use", "name": name, "input": tool_input}]}}
    )


def prompt(text):
    return json.dumps({"type": "user", "message": {"content": text}})


def result():
    return json.dumps({"type": "user", "message": {"content": [{"type": "tool_result", "content": "ok"}]}})


# Any tool carrying an executable payload counts, whatever it is called.
mixed = "\n".join(
    [prompt("ship it")]
    + [call("Bash", {"command": "npm test"})] * 4
    + [call("SomeSandbox", {"code": "print(1)"})] * 3
    + [call("Read", {"file_path": "/a.js"})] * 5
    + [result()]
)
assert count(mixed) == 7, count(mixed)

# A real user message resets the count; a tool result does not.
resumed = "\n".join([mixed, prompt("now deploy"), call("Bash", {"command": "npm test"})])
assert count(resumed) == 1, count(resumed)

# Empty payloads are not commands.
assert count("\n".join([prompt("go"), call("Bash", {"command": "   "})])) == 0

assert "demo-setup" in catalog("- demo-setup.py — brings up the demo stack. mutates.")
assert catalog("\n  \n") == ""
assert "5 more" in catalog("\n".join(f"- s{i} — does a thing." for i in range(45)))


def run(script, payload):
    """The hook as the agent runs it: JSON on stdin, whatever it prints on stdout."""
    return subprocess.run(
        [sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), script)],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        check=True,
    ).stdout


with tempfile.TemporaryDirectory() as tmp:
    transcript = os.path.join(tmp, "session.jsonl")
    with open(transcript, "w", encoding="utf-8") as handle:
        handle.write("\n".join([prompt("go")] + [call("Bash", {"command": "npm test"})] * THRESHOLD))
    assert "/strict-script-creator" in run("detect_routine.py", {"transcript_path": transcript})

    with open(transcript, "w", encoding="utf-8") as handle:
        handle.write("\n".join([prompt("go")] + [call("Bash", {"command": "npm test"})] * (THRESHOLD - 1)))
    assert run("detect_routine.py", {"transcript_path": transcript}) == ""

    assert run("detect_routine.py", {"transcript_path": os.path.join(tmp, "absent")}) == ""

    scripts = os.path.join(tmp, ".strict-ai", "scripts")
    os.makedirs(scripts)
    assert run("load_catalog.py", {"cwd": tmp}) == ""
    with open(os.path.join(scripts, "README.md"), "w", encoding="utf-8") as handle:
        handle.write("- demo_setup.py — brings up the demo stack. effect: mutates.\n")
    assert "demo_setup.py" in run("load_catalog.py", {"cwd": tmp})

print("ok")
