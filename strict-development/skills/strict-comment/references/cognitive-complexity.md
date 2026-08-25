# Cognitive complexity

A measure of how hard a function's control flow is to follow, scored per function. It is not cyclomatic complexity: a long `switch` reads easily and scores once, while three nested loops read hard and score six. Model published by SonarSource (rule `S3776`).

## Scoring

Start at 0. Walk the function body.

**Structural increment — `+1`, and `+1` per enclosing level:**

| Construct | Note |
|---|---|
| `if`, ternary | the condition, not the branch count |
| loop — `for`, `foreach`, `while`, `do` | |
| `catch` | one per clause, regardless of types caught |
| `switch` / `match` | once for the whole statement, whatever the case count |

**Structural increment — `+1`, no nesting penalty:**

| Construct | Note |
|---|---|
| `else`, `else if` | the reader is already inside the chain |
| sequence of mixed boolean operators | `a && b && c` scores 1; `a && b \|\| c` scores 2 |
| jump to a label — labeled `break`, `continue`, `goto` | a plain `break` inside a loop scores 0 |
| recursion | direct or mutual — one increment per method in the cycle, not per call site |

**Nesting level** rises inside any construct in the first table, and inside a nested function, lambda, or closure. It does not rise inside `else`.

**No increment:** the function declaration itself, `try`, `finally`, null-coalescing, optional chaining, early `return`, `break` and `continue` without a label.

## What it does not measure

The metric is syntactic: it reads control flow in the source and knows nothing about input size or what a called function costs. A loop whose body tests `if (listB.includes(a.id))` scores 3 — the loop, then the `if` one level in — and runs in `O(n·m)`; a branchless numeric kernel scores 20 and runs in `O(1)`. Algorithmic cost is a separate comment trigger — see trigger 7 in [SKILL.md](https://github.com/Viperwow/strict-ai/blob/main/strict-development/skills/strict-comment/SKILL.md).

## Threshold

Default `15`, per function — the SonarSource default for `S3776`. Override it at `strict-comment` → `cognitiveComplexityThreshold` in `.strict-ai/configs/strict-development.json`; a flat top-level field there is ignored and the default silently stands.

At or above it: refactor. When the shape is irreducible — a parser, a state machine, a protocol handshake, a numeric kernel — one comment names the invariant or the required order. Below it: no comment on complexity grounds; another trigger must fire.

## Measuring without counting by hand

| Tool | Scope |
|---|---|
| SonarQube Server, SonarQube Cloud | `S3776` through a scanner in CI, all supported languages |
| SonarQube for IDE, formerly SonarLint | the same rule inside the editor, on the file being edited |
| ESLint `complexity` rule | JS/TS, cyclomatic only — a rough proxy, not this metric |
| CodeMetrics, VS Code extension | JS/TS/Lua, inline per-function score above each declaration |
| JetBrains IDEs | built-in inspections score cyclomatic complexity; cognitive complexity needs the Sonar plugin |

No tool in reach — a chat session, an unfamiliar language, a repository with no analyzer — is not an excuse to skip the trigger: score by hand with the table above, which is what it is for. A hand count is reported as a hand count, never as a measurement.
