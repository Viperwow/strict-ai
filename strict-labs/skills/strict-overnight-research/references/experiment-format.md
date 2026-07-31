# Experiment report format

File: `docs/research/results/YYYY-MM-DD-<slug>.md`

Use when queue item `kind: experiment`. Research items use `report-format.md`.

## Template

```markdown
# <Title>

- **id:** r-NNN
- **kind:** experiment
- **date:** YYYY-MM-DD
- **status:** pass | fail | partial | blocked
- **tool:** <name or path under test>

## Hypothesis

<Expected outcome, copied/clarified from the queue item.>

## Setup

- env: <os / shell / notable versions>
- cwd: <path>
- deps installed this run: <list or none>

## Procedure

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | `command or action` | ok \| fail \| skipped | exit N; key output snippet / artifact path |
| 2 | … | … | … |

## Verdict

<2–4 sentences. pass/fail first, then what it means.>

## Evidence

```text
<Trimmed stdout/stderr or paths to screenshots under /opt/cursor/artifacts if any>
```

## Implications for this repo

- <adopt / avoid / wrap in adapter / document caveat / none>

## Follow-ups

- <new queue item suggestion, or none>
```

## Rules

1. **Never fabricate** exit codes, output, or pass/fail. If a step was not run, mark `skipped` and explain.
2. `pass` = success criteria met. `fail` = ran but criteria missed. `partial` = mixed / inconclusive. `blocked` = could not start (missing tool, auth, network).
3. Keep evidence trimmed — enough to reproduce, not full dumps.
4. Do not open drive-by refactors. Experiment reports may add only queue + result files unless the queue item explicitly asks for a tiny fixture.
5. Secrets: redact tokens from evidence. Never commit credentials.
6. Whole report ≤ ~150 lines unless tables of matrix results are the point.
