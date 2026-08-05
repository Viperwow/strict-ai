#!/usr/bin/env python3
# Repo guardrail check: every strict-* plugin holding skills must appear in
# marketplace.json and in the README availability note, and neither may list a
# plugin without skills. Reads only; exits non-zero on drift.
#
#   python3 scripts/check_marketplace_sync.py

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NOTE = re.compile(r"^>\s*\*\*Available in marketplace:\*\*(.*)$", re.M)


def with_skills():
    return {
        p.name
        for p in ROOT.glob("strict-*")
        if any(p.glob("skills/*/SKILL.md"))
    }


def main():
    expected = with_skills()

    marketplace = ROOT / ".claude-plugin" / "marketplace.json"
    listed = {p["name"] for p in json.loads(marketplace.read_text("utf-8"))["plugins"]}

    readme = (ROOT / "README.md").read_text("utf-8")
    match = NOTE.search(readme)
    if not match:
        print("README.md: availability note not found", file=sys.stderr)
        return 1
    noted = set(re.findall(r"`(strict-[a-z-]+)`", match.group(1)))

    problems = []
    for label, actual in (("marketplace.json", listed), ("README.md note", noted)):
        for name in sorted(expected - actual):
            problems.append(f"{label}: missing {name} (has skills)")
        for name in sorted(actual - expected):
            problems.append(f"{label}: lists {name} (no skills)")

    for line in problems:
        print(line, file=sys.stderr)
    if problems:
        return 1
    print(f"in sync: {len(expected)} plugins with skills")
    return 0


if __name__ == "__main__":
    sys.exit(main())
