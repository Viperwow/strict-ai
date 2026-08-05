#!/usr/bin/env python3
"""Run: python3 strict-script-creator/hooks/test_hooks.py"""

import json
import sys

from detect_routine import count
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

print("ok")
