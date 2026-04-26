# vacation-store connector reference

This connector is the local-only `aux` reference for the vacation calendar store. The JSON file at `${CLAUDE_PLUGIN_DATA}/vacations.json` is the source of truth for the local vacation calendar. It is consumed and written by `log-vacation` (skill) and read by `log-work` (skill) to filter catch-up days. v1 is single-user / single-writer.

## Class

Class: `aux`. Per `connector-pattern.md` §Class, aux connectors provide supporting non-event data and MAY be called freely as long as their effect remains local. This connector reads AND writes local JSON state on disk; it never contacts a remote system. The write operations require explicit caller intent — the consumer skill `log-vacation` already gates them through subcommands — but they do NOT require the same explicit-confirmation gate that remote-mutation `sink` connectors require, because the blast radius is local-disk only.

## Probe order

This connector has ONE probe layer. Apply the stopping rules from `connector-pattern.md` §Probe order.

1. **local-fs** — the local filesystem is assumed present in any Claude Code runtime. The connector MUST verify `${CLAUDE_PLUGIN_DATA}` exists and is writable on first call; if not, surface `unsupported` with hint `"plugin data directory unavailable"`.

**Deviation note.** With a single layer, the layer-fallthrough rules from §Probe order and §Fallback rules are unreachable here.

## Auth

N/A. This connector reads no environment variables for authentication and contacts no remote system. The `${CLAUDE_PLUGIN_DATA}` path is a runtime-injected directory provided by the Claude Code plugin host, not a user-set credential — same wording as `holidays.md`. Credential masking rules from `connector-pattern.md` §Auth do not apply.

## Capabilities

- `read: true`
- `write: true` — local-disk only.
- Operations:
  - `list_entries()` — returns the canonical envelope with `data.entries` carrying `VacationEntry[]`.
  - `add_entry(entry)` — appends a new entry; returns the canonical envelope with `data.entry` carrying the inserted record. UUIDv4 is assigned by the connector if absent.
  - `update_entry(id, patch)` — patches an existing entry in place; returns the updated record. Patching is a shallow merge over top-level keys; nested `external_ref` is replaced wholesale, not merged. A patch field set to `null` clears that field on the entry; a patch field that is absent leaves the existing value unchanged.
  - `remove_entry(id)` — deletes an entry; returns the canonical envelope with `data.removed_id` and `data.removed: true|false`.
  - `lock()` — acquires a cooperative file-lock via `${CLAUDE_PLUGIN_DATA}/vacations.lock`. Best-effort; single-user enforcement; NOT crash-safe for multi-writer scenarios.
- `entities`: `vacation-entry`.
- `pagination`: N/A — the local store is small; the full set is returned on `list_entries()`.
- `rate-limit policy`: N/A.

## Storage

- Path: `${CLAUDE_PLUGIN_DATA}/vacations.json` — a runtime-injected directory.
- Format: JSON with the top-level shape `{ "version": 1, "entries": [ /* VacationEntry */ ] }`. The wire shape is documented here; rule-level schema for entries is documented by `log-vacation/references/store-schema.md` (the consumer skill).
- Write protocol: write to `vacations.json.tmp`, fsync, rename over the target. Cite `Atomic writes` from `idempotency.md`.
- Corrupted-file recovery: if the file fails JSON parse, the connector MUST rename it to `vacations.json.bak.<ISO-8601-UTC>`, start fresh with `{ "version": 1, "entries": [] }`, and surface a warning under `data.warnings`.
- Lock: `${CLAUDE_PLUGIN_DATA}/vacations.lock` — a sibling file containing the calling process's pid and an ISO-8601 acquire timestamp. Cooperative only.

## Output shape

Every response MUST be wrapped in the canonical envelope from `connector-pattern.md` §Output shape. `connector` is always `"vacation-store"`. `kind` ∈ `{ "vacation-entry-batch", "vacation-entry", "vacation-entry-removed" }` per operation.

**Deviation from §Output shape (`source` field).** The canonical `source` enum is `mcp | cli | rest`. This connector has no transport tier and reports `source = "local-fs"` — the only layer. This is the only divergence from the canonical enum (precedent: `location.md`, `holidays.md`) and is documented here so consumers do not treat it as drift.

`data.warnings` MUST be present (possibly empty) on every response (precedent: `git.md`).

```json
{
  "kind": "vacation-entry-batch",
  "source": "local-fs",
  "connector": "vacation-store",
  "timestamp": "<ISO-8601 UTC>",
  "data": { "entries": [ /* VacationEntry[] */ ], "warnings": [] }
}
```

`add_entry` and `update_entry` envelopes use `kind = "vacation-entry"` and `data = { "entry": <VacationEntry>, "warnings": [] }`. `remove_entry` envelopes use `kind = "vacation-entry-removed"` and `data = { "removed_id": "<id>", "removed": true, "warnings": [] }`.

### `VacationEntry` schema

```json
{
  "id": "<uuid-v4>",
  "from": "<YYYY-MM-DD>",
  "to": "<YYYY-MM-DD>",
  "reason": "vacation | sick | holiday | other",
  "note": "<plain string or null>",
  "source": "local | bamboo | merged",
  "created_at": "<ISO-8601 UTC>",
  "updated_at": "<ISO-8601 UTC>",
  "external_ref": { "bamboo_id": "<id>" }   // OPTIONAL — omit the entire key when no external ref exists
}
```

`VacationEntry.source` is the per-record provenance tag (`"local"` for hand-added, `"bamboo"` for `sync`-imported, `"merged"` for entries that were imported and then locally edited). `envelope.source` is always `"local-fs"` — the transport layer. The two fields are distinct; disambiguate explicitly per the `bamboohr.md` `TimeOff.source` vs `envelope.source` precedent.

`external_ref` is OPTIONAL: when there is no external reference, the connector MUST omit the key entirely rather than emit `{}` or `null` — matches the null-omission precedent in `jira-worklog.md`.

## Validation rules

Applied on `add_entry` and `update_entry`:

- `from <= to` (lexicographic on `YYYY-MM-DD` is the same as chronological).
- `from >= <today minus 1 year>`, where `<today>` is the calendar date of the captured UTC instant per the `Single now` rule from `idempotency.md`.
- `to <= <today plus 2 years>`.
- `reason ∈ { "vacation", "sick", "holiday", "other" }`.
- `source ∈ { "local", "bamboo", "merged" }`.
- Overlap policy: a candidate entry overlaps an existing entry when `[candidate.from, candidate.to]` intersects `[existing.from, existing.to]` for any existing entry. Reject the write unless the caller passes `overlap_strategy ∈ { "merge", "replace", "cancel" }`:
  - `merge` — extend the existing entry's range to cover the union of both spans (`from = min(existing.from, candidate.from)`, `to = max(existing.to, candidate.to)`). The existing entry's `id` and `created_at` are preserved; `updated_at` advances to the current `Single now`. `note` and `external_ref` from the candidate REPLACE the existing values when present in the candidate; absent fields leave the existing values intact. `source` becomes `"merged"` when the existing and candidate `source` differ; otherwise it is preserved.
  - `replace` — delete the existing entry, insert the candidate. The candidate's `id` survives (or a fresh UUIDv4 is assigned if absent) and its `created_at` is the current `Single now`.
  - `cancel` — abort the write. The connector returns the canonical envelope with no entry written, `data.warnings` populated with the conflict, and (for `add_entry`) `data.entry` omitted entirely.
- Validation failures surface as `unsupported` per the canonical taxonomy with a specific hint string (e.g. `"from must be ≤ to"`, `"reason out of enum"`).

## Error taxonomy

Inherits from `connector-pattern.md` §Error taxonomy. Connector-specific notes:

- `unsupported` is the only domain-specific code expected: missing data directory, unwritable disk, invalid input, validation failures, overlap rejections.
- `network` — N/A.
- `auth` — N/A.
- Filesystem errors (EACCES, ENOSPC, EIO, etc.) surface as the canonical `server`-class code with the OS message truncated to 200 Unicode code points. Truncation MUST NOT slice mid-codepoint and MUST NOT append an ellipsis (same policy as the `git.md` commit-subject rule, with a different length budget).
- Lock contention: if `vacations.lock` exists and references a pid that is still alive, surface `unsupported` with hint `"vacation-store locked by pid <N> since <timestamp>"`. If the pid is stale (process not alive), the connector MAY break the lock and continue. Liveness is probed via `kill(pid, 0)` on POSIX and `OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, …)` on Windows; any error other than EPERM/access-denied (which still indicates a live process) is treated as "stale".
- Malformed lock file (zero-byte, missing pid, unparseable timestamp, or pid not a positive integer) MUST be treated as stale: the connector breaks the lock, surfaces a warning under `data.warnings`, and continues.

## Fallback rules

Inherits from `connector-pattern.md` §Fallback rules. With only one probe layer the layer-fallthrough is unreachable. Stop.

## Forbidden behaviors

In addition to `connector-pattern.md` §Forbidden behaviors, this connector:

- MUST NOT contact any remote system. The store is local-disk only.
- MUST NOT write outside `${CLAUDE_PLUGIN_DATA}/`. The store path is fixed (`vacations.json`) and never derived from caller input — there is no input field that names a path — so this is a structural guarantee, not a runtime validation.
- MUST NOT delete the backup file `vacations.json.bak.*`. The user inspects backups manually; the connector creates them on corruption recovery and never reaps them.
- MUST NOT bypass the `lock()` / unlock cycle on writes. Reads MAY skip the lock (best-effort consistency is acceptable for `list_entries()`).
- MUST NOT mutate `created_at` after first write. `updated_at` is updated on every write.

## Idempotency

Per `idempotency.md`. Each mutation is atomic per the `Atomic writes` rule. The duplicate-detection key for `add_entry` is the tuple `(from, to, reason)` — re-adding an entry with the same triple MUST detect-and-warn (returning the existing entry's id) rather than appending a second copy. `remove_entry` of a nonexistent id is a no-op (returns `removed: false`) with a warning. `envelope.timestamp`, `created_at`, and `updated_at` MUST all derive from the single UTC instant captured at operation start per the `Single now` rule.
