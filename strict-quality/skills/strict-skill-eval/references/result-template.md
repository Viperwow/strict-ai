# Skill / agent eval result

```markdown
# Eval result — <skill-or-agent-name> / <case-id>

## Meta
- date: <ISO-8601>
- executor: <runtime / model>
- grader: <separate context or harness>
- commit: <sha or n/a>

## Correctness (gate)
- status: PASS | FAIL
- first_attempt: PASS | FAIL
- self_corrected: true | false
- failed_assertions:
  - <assertion id or text>
- evidence:
  - <path, field, or tool-call log pointer>

## Efficiency (non-gating)
- tool_calls: <n>
- tokens_in: <n or unknown>
- tokens_out: <n or unknown>
- wall_time_s: <n or unknown>

## Decision
- ship: yes | no
- next_action: <fix skill | narrow case | add case | none>
```

## Grading notes

- If `self_corrected` is true and the assertion only holds after a repair edit in the same run, correctness is **FAIL** even when the final artifact looks right.
- Efficiency fields never flip `ship`.
