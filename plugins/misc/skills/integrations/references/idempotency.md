# Idempotency rules

Skills that interact with external state (Jira, filesystems, caches) MUST be
safe to run multiple times and produce identical observable results for the same
inputs. The rules below enforce determinism at every layer a consumer skill
touches.

## Rules

### 1. Single `now`

Capture one UTC timestamp at skill start and reuse it everywhere: age math,
`Generated:` header lines, filename stamps, and cache-bucket selection. Calling
`Date.now()` / `time.time()` / `DateTime.UtcNow` more than once per skill run
MUST NOT happen — successive calls can return different values and break
reproducibility.

```text
# Correct pattern — assign once, reuse everywhere
RUN_AT = utc_now()                        # called exactly once

report_header = f"Generated: {RUN_AT}"
filename      = f"report-{RUN_AT:%Y%m%d}.json"
age_days      = (RUN_AT - issue.created).days
cache_bucket  = RUN_AT.strftime("%Y-%W")
```

### 2. Atomic writes

Every state write MUST follow the sequence: write to a `.tmp` file → `fsync` →
rename over the target. A skill MUST NOT truncate-then-write. If a process
crashes after truncation and before the write completes, the target file is left
half-written and unrecoverable. `rename` is atomic on POSIX and best-effort
atomic on Windows NTFS, so the target is never in a partial state.

```text
write  state.json.tmp   # write full content to temp path
fsync  state.json.tmp   # flush OS buffers to disk
rename state.json.tmp → state.json   # atomic swap
```

### 3. Stable sort keys

Every sort operation MUST fully specify its tie-breakers. The final tie-breaker
MUST be a key that is guaranteed unique across all rows (Jira issue key using
natural sort, a UUID column, or a stable content hash). Sorts MUST be pure —
wall-clock values (timestamps captured during the sort) MUST NOT appear as sort
inputs. Partial orderings that leave ties unresolved produce different output on
different runs.

### 4. Missing-value sentinel

Absent cells and fields MUST be rendered as `—` (em-dash, U+2014). Skills MUST
NOT use empty string, `null`, `N/A`, `undefined`, or any other placeholder.
This rule applies to rendered Markdown tables, CSV output, and any normalized
data structure a user will read. A consistent sentinel makes absence visually
unambiguous and easy to grep.

### 5. Existing worklogs are source of truth

Consumers MUST NOT delete or rewrite worklogs that already exist in Jira. A
skill MAY only add the missing delta. Duplicate-detection rule: if an existing
worklog has `duration_minutes == proposed` AND `comment == proposed` (byte-equal
comparison) on the same issue, day, and author, the skill MUST skip it (no-op).
Any other state — differing duration, differing comment, or no existing worklog —
MUST result in adding a new entry. Multiple entries for the same day are correct
and auditable; silent overwrites are not.

### 6. Auto-created artifacts are labeled

Any Jira issue a skill creates MUST carry a configured label (default:
`auto-logged`). Future probes and consumer skills MUST search for this label
before creating a new issue; if a matching labeled issue already exists, they
MUST reuse it. Creating a duplicate because the label was absent is a
correctness failure, not a minor warning.

### 7. No random

Skills MUST NOT generate random values (including UUIDs) in rendered output
unless the value is directly user-facing and has no deterministic alternative.
For internal grouping keys, use a stable hash of the content instead. For
vacation or placeholder entries that require a UUID (e.g., Jira mandates one),
generate the UUID exactly once at `add` time, persist it alongside the record,
and reuse the persisted value on every subsequent run. Never regenerate a UUID
for an entry that already has one.

### 8. Deterministic `JQL:` line

Any `JQL:` line emitted by a skill for auditability MUST contain the fully
resolved query — all placeholders substituted with the runtime values that were
actually used. A user MUST be able to copy the `JQL:` line verbatim, paste it
into Jira advanced search, and receive the exact result set the skill operated
on. Emitting a template with unresolved variables (e.g., `project = {PROJECT}`)
is forbidden.
