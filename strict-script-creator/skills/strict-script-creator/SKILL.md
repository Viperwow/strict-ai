---
name: strict-script-creator
description: Use when a multi-step routine repeats — turning a repeated command sequence into a reusable script under .strict-ai/scripts/, and removing scripts nothing calls. Invoke when the user asks to automate or script a routine, when a command-heavy turn is reported, when you notice yourself reproducing the same sequence by hand, or when the script folder has grown. Triggers on /strict-script-creator.
---

# strict-script-creator

Turns a repeated routine into a script once, then reuses it. Owns both ends: it writes scripts and it removes the ones nothing calls.

The trade is explicit — 20% of the effort for 80% of the impact. A script that does not pay for itself must not be written.

## Reuse before doing

The catalog arrives in context at session start, so before performing a multi-step routine by hand you already know whether a script covers it. If one does, run it. Reuse beats reproduction.

The catalog answers three questions without a read: what exists, what was already automated, and what was deliberately left alone. Fall back to reading `.strict-ai/scripts/README.md` only when it is not in context.

## Invocation

```text
/strict-script-creator [what repeats]     # create
/strict-script-creator --cleanup          # cleanup
```

Three entry points converge on the create flow: the user invokes it, a command-heavy turn is reported to you, or you notice the repetition yourself. A report is an invitation to look at your own turn, not a finding — judging whether those commands were one routine or several distinct steps is yours alone, and the arguments carry intent no counter can read.

## Artifacts

Written in the target project, created on first use:

```text
.strict-ai/scripts/
  README.md        # registry, one line per script
  <name>.<ext>     # the scripts themselves
```

Names are kebab-case. No other state is written anywhere: metadata lives in the script header, call history lives in the session log named by the binding table.

## Create flow

| Step | You do | Gate |
|---|---|---|
| 1 | Take the catalog, count its entries | equivalent script exists → call it, write nothing |
| 2 | Apply the 80/20 gate: repetitions × manual steps against the cost of the script | fails → append a `skip:` line, say so in one line, stop |
| 3 | Probe the machine, pick the runtime, state the choice in one sentence, check the name | file with that name exists → rename |
| 4 | Write `.strict-ai/scripts/<name>` with its header | never gated |
| 5 | Run the script once to verify it works | `read-only` → run; `mutates` → **ask first** |
| 6 | Append one line to the registry, creating it if absent | — |
| 7 | `read-only` only: allowlist the exact script in the agent's permission file | `mutates` → never allowlisted |
| 8 | Step 1 counted more than 20 entries → append one reminder line about `--cleanup` | — |

Writing is never gated, whatever the script does. Only execution is gated.

**Step 2 saying no** costs one line in the registry, so the same routine is not re-evaluated every session. Record the verdict, not the deliberation.

**Step 5 failing.** Two repair attempts. Still failing on the third — or declined by the human, so it never ran — the file stays and its registry line is marked `unstable.`. The mark is a label, not a verdict: cleanup still decides on invocations, and whoever confirms the script works removes the mark by hand.

**Step 7** is what makes the automation pay off: a script run twenty times a day behind a confirmation prompt costs twenty clicks. Name one exact script, never the folder — `python3 .strict-ai/scripts/demo_report.py`, not the directory — or the run gate deletes itself for every file written later. Merge into the existing permission file: read the JSON, append one entry, keep every other key untouched. The file and its entry format come from [references/agent-bindings.md](https://github.com/Viperwow/strict-ai/blob/main/strict-script-creator/skills/strict-script-creator/references/agent-bindings.md).

Step 8 is the only cleanup trigger. No schedule, no background process — the pressure to stay clean appears when the folder grows.

## Script header

Every script carries a shebang and three marker lines:

```python
#!/usr/bin/env python3
# strict:purpose  Bring up the demo stack with seed data.
# strict:effect   mutates
# strict:usage    python3 .strict-ai/scripts/demo_setup.py [--reset]
```

The shebang is the single source of truth for the runtime; no marker repeats it. `strict:effect` is declared at creation, never inferred later. The markers also tell cleanup that the mechanism wrote the file rather than a human.

## Registry

`.strict-ai/scripts/README.md`, one line per decision. Two kinds:

```markdown
- demo_setup.py — brings up the demo stack with seed data. run: `python3 .strict-ai/scripts/demo_setup.py`. effect: mutates.
- skip: rebuilding every image from scratch — twice a month, four steps. The gate says no.
```

This file is loaded whole into context at session start, so every line is paid for on every session. Keep each to what a reader needs to decide: the name, what it does, how to run it, what it touches. No links — the path is right there. A script whose verification run did not pass carries a trailing `unstable.`.

A `skip:` line is what keeps a rejected routine rejected. Without it the 80/20 gate is re-litigated from scratch every time the routine comes up.

## Run gate

Before running any script from the registry, read its `effect`:

- `read-only` — run it without asking.
- `mutates` — ask for confirmation first.

## Runtime selection

The project's own language is not a factor — a Python repository may never be executed at all.

1. Probe once per script creation, in one call that cannot fail: `command -v python3 node pwsh sh || true`.
2. Default priority among what is available: **python → node → POSIX sh**. Python reads JSON and files from its standard library, and it is the runtime the published skill collections settle on.
3. The task overrides the priority: data parsing where a Python library already fits goes to Python; a thin wrapper over existing CLI commands goes to `sh`.
4. State the choice in one sentence before writing — runtime, why, what the probe found. A silent pick is unreviewable.

Check the name against the registry **and** against the folder. The two catch different failures: a script can sit on disk without a registry line, and a registry line can outlive a deleted file.

A script other scripts call prints machine-readable output. A script only a human reads may print whatever is clearest. On failure: exit non-zero, one line to stderr. The step 5 run is the test; generated scripts get no separate suite.

## Cleanup flow

Usage is counted from native data. A script is invoked by a literal path, so its invocation count is the number of times that path appears in the session log named by the binding table. Read only the current project's sessions, matching every script name in one pass.

| Step | You do |
|---|---|
| 1 | Read the registry |
| 2 | Per script: count its path across the session log, take the most recent hit |
| 3 | Classify each script |
| 4 | Delete what qualifies for autonomous removal, with its registry line |
| 5 | Show the full table and ask about everything else |

**Removed autonomously** only when both halves hold:

- never useful — zero invocations. Every script runs once at creation, so zero means it never even passed verification, not that it is needed rarely;
- costs nothing — the header carries `strict:*` markers, and the file is committed with no local changes, so a revert is one command.

**Goes to the human** — everything else: at least one invocation, no markers, uncommitted changes, or marked `unstable`.

The report is the same either way: name, invocations, last seen, verdict (`keep` / `drop`). Files removed autonomously are listed explicitly.

Accepted ceiling: a script the user runs by hand in their own terminal never appears in the session log and lands among the candidates. That is why deletion outside those conditions always asks.

## Where a script ends up

A script is the first form, not the final one. This skill owns routines local to one repository. Name the exit rather than quietly outgrowing the folder — and convert nothing in place; the script stays the running prototype.

| Signal | Form |
|---|---|
| Repeated actions inside one repository, reproduced verbatim | script — this skill |
| Needed from any repository, outlives this project, has its own commands, config, or auth | CLI on `PATH` — hand it to a CLI-building skill |
| One tool, one usage story | CLI plus a companion skill |
| A domain: several commands, plus hooks, agents, or slash commands shipped together | plugin |

## Common mistakes

| Mistake | Reality |
|---|---|
| Reproducing a routine the catalog already covers | The catalog is in context from session start. Reuse first. |
| Writing a script for a routine seen once | The 80/20 gate exists to say no. A folder of a thousand scripts of which ten are used is the failure mode. |
| Re-deciding a routine already rejected | The `skip:` line is the decision. Read it, do not redo the gate. |
| Treating a reported turn as proof of a routine | A count is not a finding. Seven commands can be seven different steps. |
| Running a `mutates` script to "just verify it" | Writing is free, running is the irreversible act. Ask. |
| Allowlisting the scripts folder | It pre-approves every `mutates` script written later. One exact script per entry. |
| Keeping a script that never ran | Zero invocations means it never passed verification. Committed and marked → delete it. |
| Inferring `effect` from the code at call time | Declared once at creation, in the header. Reading code to decide is how a wrong call gets made. |

## Composition

Scripts call each other as ordinary shell commands. The registry is the table of contents. There is no runner and no framework.

## References

- [references/agent-bindings.md](https://github.com/Viperwow/strict-ai/blob/main/strict-script-creator/skills/strict-script-creator/references/agent-bindings.md) — per-agent session log, proactive event, and permission file; what to do when there is no row.
