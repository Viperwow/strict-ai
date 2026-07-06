---
name: strict-grep
description: Use this skill when Bash commands need fast and accurate project/codebase text search, recursive source inspection, file listing, or pre/post-edit verification. Prefer ripgrep (`rg`) for cases where it is effective: line-oriented regex search over files/directories, repository exploration, source-code search, config search, and targeted log/text search. Select system `grep` when exact POSIX/GNU grep semantics, compatibility, stdin-oriented grep usage, or grep-specific behavior is required. Before relying on `rg` in an unknown environment, verify availability with `rg --version` and check local argument support with `rg --help`.
---

# strict-grep

## Official reference

Installation reference:

```text
https://github.com/burntsushi/ripgrep#installation
```

## Scope

Use `ripgrep` (`rg`) as the preferred Bash search tool for scenarios where it is a strong fit:

* recursive project/codebase text search
* source-code and configuration search
* repository exploration
* listing searchable project files
* locating references before edits
* verifying edits after changes
* targeted search in text logs or structured text files

Select system `grep` for scenarios that need grep behavior:

* exact POSIX/GNU grep semantics
* preservation of a user-provided grep-compatible command
* scripts, CI commands, or reproducible examples that expect `grep`
* grep-specific flags or behavior
* simple stdin pipelines where grep is clearer
* binary/byte-level behavior that should match grep

Call system grep explicitly:

```bash
command grep "pattern" file
```

## Availability and installation checks

Before relying on `rg` in a new or unknown environment, verify that ripgrep is installed:

```bash
command -v rg >/dev/null 2>&1 && rg --version
```

When `rg` is available, use it for the scoped search tasks above.

When `rg` is missing, identify the system and package manager first, then follow the author's installation recommendations from the official reference above. Ask for user approval before installing software. Treat an explicit user request to install missing dependencies as approval to proceed.

Use safe system-identification commands before choosing installation guidance.

For Unix-like systems:

```bash
uname -a
```

For Linux:

```bash
cat /etc/os-release
```

For macOS:

```bash
sw_vers
command -v brew >/dev/null 2>&1 && brew --version
```

For Windows-like shells:

```bash
command -v winget >/dev/null 2>&1 && winget --version
command -v choco >/dev/null 2>&1 && choco --version
command -v scoop >/dev/null 2>&1 && scoop --version
```

## Local help and argument checks

When unsure whether an `rg` flag, type filter, regex feature, or argument is supported by the installed version, check local help first:

```bash
rg --help
```

For targeted checks:

```bash
rg --help | rg -- '--hidden|--glob|-u|--files|-P|-U|--json|--type|--encoding'
```

Prefer local `rg --help` over memory because installed versions can differ.

## Core search rules

Use explicit `rg` commands for ripgrep behavior.

Use:

```bash
rg "pattern" path/
```

Instead of constructing recursive grep pipelines:

```bash
grep -R "pattern" path/
find . -type f | xargs grep "pattern"
ls | grep "pattern"
```

Use `rg` explicitly for ripgrep behavior.

Use `command grep` explicitly for grep behavior.

## Search escalation ladder

Choose the narrowest scope that covers the expected target files. Escalate when the target may be hidden, ignored, generated, vendored, cached, or binary-like.

For normal project source search:

```bash
rg "pattern"
```

For hidden files such as `.github`, `.env.example`, `.config`, or dotfiles:

```bash
rg --hidden --glob '!.git/' "pattern"
```

For ignored files such as generated, vendored, cached, or normally ignored paths:

```bash
rg -u "pattern"
```

For ignored plus hidden files:

```bash
rg -uu "pattern"
```

For exhaustive text search, including binary-like files, when the task requires complete coverage:

```bash
rg -uuu -a "pattern"
```

## File listing

Use `rg --files` to list searchable project files when ripgrep's ignore behavior matches the task.

Prefer:

```bash
rg --files
rg --files | rg "pattern"
```

Instead of constructing generic file-listing pipelines:

```bash
find . -type f
find . -type f | grep "pattern"
```

For hidden files:

```bash
rg --files --hidden --glob '!.git/'
```

For ignored files:

```bash
rg --files -u
```

For ignored plus hidden files:

```bash
rg --files -uu
```

Use `find` when the task requires filesystem predicates such as mtime, size, permissions, ownership, symlinks, empty files, or directory-only traversal.

## Pattern precision

Choose precise patterns over broad terms.

Prefer:

```bash
rg '\bfunctionName\b'
rg '^class UserService\b'
rg 'from ["'\'']@/lib/auth["'\'']'
```

When broad discovery is useful, pair broad terms with path filters, type filters, or follow-up focused searches.

Use fixed-string search for literal text, especially when the pattern contains regex metacharacters:

```bash
rg -F "literal.string.with.dots"
rg -F "foo(bar)"
rg -F "path/to/file.js"
```

Use word boundaries when searching identifiers:

```bash
rg '\bUserService\b'
```

Use `--` when the pattern starts with a dash:

```bash
rg -- "-flag-name"
```

## Case handling

Use smart case for human-entered searches when available:

```bash
rg --smart-case "pattern"
```

Use exact case when case matters:

```bash
rg "ExactName"
```

Use case-insensitive search when casing may vary:

```bash
rg -i "pattern"
```

## Output control

Use line numbers for navigation:

```bash
rg -n "pattern"
```

Use columns for exact edit locations:

```bash
rg -n --column "pattern"
```

Show only matching file names when planning edits:

```bash
rg -l "pattern"
```

Show counts when measuring scope:

```bash
rg -c "pattern"
```

Use context when surrounding code helps interpretation:

```bash
rg -n -C 2 "pattern"
```

## File filters

Use type filters when they match the task and are supported locally:

```bash
rg -t py "pattern"
rg -t js "pattern"
rg -t ts "pattern"
rg -t md "pattern"
```

Use globs for exact file selection:

```bash
rg "pattern" -g '*.tsx'
rg "pattern" -g '*.{ts,tsx}'
rg "pattern" -g '!dist/'
rg "pattern" -g '!coverage/'
```

Add exclusion globs when dependency, build, cache, or VCS directories create noise:

```bash
rg "pattern" -g '!node_modules/' -g '!vendor/' -g '!dist/' -g '!build/' -g '!coverage/' -g '!.git/'
```

## Multiline and advanced regex

Use multiline mode when the pattern spans lines:

```bash
rg -U 'first line\nsecond line'
```

Use PCRE2 when lookaround, backreferences, or advanced regex features are required:

```bash
rg -P 'foo(?=bar)'
```

Check local support before using advanced features such as `-P`, `-U`, `--json`, custom type filters, or encoding flags:

```bash
rg --help | rg -- '-P|-U|--json|--type|--encoding'
```

Prefer normal `rg` regex for standard search tasks.

## Accuracy checks before editing

Before editing files, locate all relevant matches:

```bash
rg -n "oldPattern"
```

After editing, verify the old pattern count or locations:

```bash
rg -n "oldPattern"
```

Then verify the new pattern exists where expected:

```bash
rg -n "newPattern"
```

For broad refactors, use `rg -l` first to identify affected files:

```bash
rg -l "oldPattern"
```

## Replacement workflow

Use `rg` to find replacement targets. Use an appropriate editing tool, patch, or script to modify files. Verify the result with `rg` after changes.

## Shell safety

Quote patterns and globs.

Prefer:

```bash
rg '\bTODO\b' -g '*.py'
```

Instead of relying on shell expansion:

```bash
rg \bTODO\b -g *.py
```

Prefer single quotes around regex patterns when shell interpolation is unnecessary.

## Grep-compatible fallback

When `rg` is unavailable and installation is out of scope, use system `grep` explicitly and narrowly:

```bash
command grep -R "pattern" src/ tests/
```

When using `grep`, preserve grep semantics and translate flags only when the mapping is obvious and verified.
