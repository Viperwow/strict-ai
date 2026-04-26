# git connector reference

This connector reads commits from local Git repositories and emits normalized `WorkEvent` records of `kind=commit`. It is independent of Jira and Tempo; no remote system is contacted. It is consumed by `log-work` to attribute committed code to issues for time-logging suggestions.

## Class

Class: `source`. Per `connector-pattern.md` §Class, source connectors MUST NOT mutate remote state. This connector reads only local repositories — no network, no remote interaction of any kind.

## Probe order

This connector has a SINGLE probe layer. Apply the stopping rules from `connector-pattern.md` §Probe order.

1. **CLI** — run `git --version` against the binary on `PATH`. If exit code is `0`, layer = `cli`.

There is NO MCP layer and NO REST layer for git in v1. If the CLI probe fails with `not-found` (binary missing on `PATH`), the connector MUST surface `unsupported` to the caller; there is no next layer to fall through to.

## Auth

N/A. Git operates on local repositories with no authentication. This connector reads no environment variables.

## Capabilities

- `read: true`
- `write: false`
- Operations:
  - `commits_for(date, repos, author_email)` — returns all `WorkEvent` records of `kind=commit` for the given calendar `date`, scanning every repo in `repos[]`, filtered by `author_email`. `date` is an ISO-8601 calendar date (`YYYY-MM-DD`); `repos` is an array of absolute filesystem paths.
  - `list_repos(root?)` — returns the active repo set: either `[<git-root-of-cwd>]` if `root` is omitted, or the explicit list configured by the consumer (forward reference: future config key `git_repos` consumed by the caller). This connector itself does NOT read any config file.
- `entities`: `work-event` (matches `jira-activity.md`'s entity name to keep the source-class entity uniform across connectors).
- `pagination`: `none` — `git log` returns the full window in one call.
- `rate-limit policy`: N/A (local subprocess; no rate limit applies).

### Event derivation

For each repo in `repos`, run:

```
git -C <repo> log --author="<author_email>" --since="<date>T00:00:00<localtz>" --until="<date+1>T00:00:00<localtz>" --pretty=format:"%H%x09%ct%x09%s"
```

The output is tab-separated: full hash, committer Unix timestamp, commit subject. The body is fetched via a follow-up `git -C <repo> show -s --format=%B <hash>` per commit, but only as an optimization when the issue-key regex misses the subject — skip the body fetch when the subject already yields one or more keys.

Filter rule: keep only commits whose committer timestamp falls within `[<date>T00:00:00<localtz>, <date+1>T00:00:00<localtz>)`. The `--since` / `--until` flags pre-filter, but git's date semantics are looser than calendar-day; the explicit timestamp check is the source of truth.

**Issue-key extraction.** Apply the regex `[A-Z][A-Z0-9]+-\d+` (case-sensitive) against the commit subject AND body. Extract every match; deduplicate by exact string equality preserving first-seen order.

**WorkEvent emission rule.**

- 0 keys extracted → emit ONE `WorkEvent` with `issue_key: null`, `raw_weight: 1.0`, `metadata.keys: []`.
- 1 key extracted → emit ONE `WorkEvent` with `issue_key: "<KEY>"`, `raw_weight: 1.0`, `metadata.keys: ["<KEY>"]`.
- N ≥ 2 keys extracted → emit `N` `WorkEvent` records, one per key. Each carries `issue_key: "<KEY_i>"`, `raw_weight: 1.0/N`, and `metadata.keys: ["<KEY_1>", …, "<KEY_N>"]` (the full key list, identical across the N events). All N events share the same `metadata.hash` and `metadata.repo`. This is the canonical interpretation of the plan rule "all get credit; default weight split evenly".

**Branch metadata.** Populate `metadata.branch` with the result of `git -C <repo> rev-parse --abbrev-ref HEAD` at scan time. If HEAD is detached, set `metadata.branch` to the short hash with `" (detached)"` appended.

## Output shape

Each call returns ONE canonical envelope per `connector-pattern.md` §Output shape. The envelope's `data.events` field carries the array of `WorkEvent` records produced for the requested day.

### Envelope

```json
{
  "kind": "work-event-batch",
  "source": "cli",
  "connector": "git",
  "timestamp": "<ISO-8601 UTC>",
  "data": {
    "date": "YYYY-MM-DD",
    "repos": ["/abs/path/to/repo"],
    "author_email": "user@example.com",
    "events": [ /* WorkEvent[] */ ]
  }
}
```

`envelope.source` is always `"cli"` since CLI is the only available layer. `commits_for` is single-day per the plan; an `events_for_range`-style helper is OUT of scope for v1.

### WorkEvent

```json
{
  "date": "YYYY-MM-DD",
  "source": "git",
  "kind": "commit",
  "issue_key": "PROJ-123",
  "summary": "abc1234: <commit subject truncated to 100 chars>",
  "raw_weight": 1.0,
  "metadata": {
    "repo": "/abs/path/to/repo",
    "hash": "abc1234...",
    "subject": "<full subject>",
    "keys": ["PROJ-123", "PROJ-456"],
    "branch": "feature/xyz"
  }
}
```

`issue_key` MAY be `null` when no key is extracted. `summary` is `<7-char hash prefix>: <subject truncated to 100 chars>`; truncation is applied to the subject only and uses no ellipsis. `metadata.keys` is the full deduplicated list of keys extracted from this commit, identical across every WorkEvent emitted from a single commit when N ≥ 2. `WorkEvent.kind` is always `"commit"` for this connector and is distinct from `envelope.kind`, which is always `"work-event-batch"`.

## Error taxonomy

Inherits from `connector-pattern.md` §Error taxonomy. Connector-specific notes:

- `not-found` — when a repo path in `repos[]` does not exist OR is not a git repository (`.git` directory absent OR `git -C <path> rev-parse --is-inside-work-tree` returns non-zero). The connector MUST log a warning naming the path, SKIP that repo, and CONTINUE with the remaining repos. It MUST NOT abort the call. Warnings are surfaced under `data.warnings: [...]` in the response envelope (single canonical form for this connector).
- `network` — N/A; git operates locally.
- `auth` — N/A.
- Empty result (a repo with zero matching commits in the window) is NOT an error — the repo contributes zero events to the output.

## Fallback rules

Inherits from `connector-pattern.md` §Fallback rules without modification. With only one probe layer the "fall through to next layer" path is unreachable; an `unsupported` from the CLI layer (binary missing) terminates probing.

## Forbidden behaviors

In addition to `connector-pattern.md` §Forbidden behaviors, this connector:

- MUST NOT mutate any repository state. No `git commit`, `git push`, `git fetch`, `git pull`, `git checkout`, `git merge`, `git rebase`, `git reset`, `git tag`, or any subcommand that modifies the working tree, index, refs, remotes, or `.git` internals. Read-only commands ONLY (`log`, `show`, `rev-parse`).
- MUST NOT recurse into submodules. `--recurse-submodules` is forbidden in v1.
- MUST NOT execute hooks. Read-only commands do not invoke hooks; this prohibition is stated for clarity.

## Idempotency

`git log` over a closed timestamp window is deterministic — commit timestamps and hashes are immutable once written. Re-running `commits_for(date, repos, author_email)` over the same triple produces an identical envelope (modulo `envelope.timestamp`, which is the connector's own normalization clock and follows the `Single now` rule from `idempotency.md`). Stable ordering of events MUST follow the `Stable sort keys` rule from `idempotency.md`: sort by `(metadata.repo, metadata.hash, issue_key)` so ties are fully resolved.

`metadata.branch` MAY change between calls if the repo is checked out to a different branch — note this caveat. The branch label is observational and does not affect event identity.
