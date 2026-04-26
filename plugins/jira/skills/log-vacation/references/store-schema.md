# store-schema — `vacations.json`

Reference for the local vacation calendar storage consumed by the `log-vacation` skill and read by `log-work`.

## File location

`${CLAUDE_PLUGIN_DATA}/vacations.json`. `${CLAUDE_PLUGIN_DATA}` is a runtime-injected directory provided by the Claude Code plugin host, not a user-set credential — same wording as `vacation-store.md` §Auth.

## Top-level schema

```json
{
  "version": 1,
  "entries": [ /* VacationEntry */ ]
}
```

`version` is a positive integer. `entries` is an ordered array; the canonical sort order for `list` output is ascending `from`, then ascending `id` as a tie-breaker.

## VacationEntry

Full field-by-field description:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | UUIDv4. Assigned by the vacation-store connector on `add_entry` if absent from the caller. MUST NOT change after first write. |
| `from` | string | yes | ISO-8601 calendar date `YYYY-MM-DD`. First day of absence. |
| `to` | string | yes | ISO-8601 calendar date `YYYY-MM-DD`. Last day of absence. MUST be `>= from`. |
| `reason` | string | yes | Enum: `"vacation" \| "sick" \| "holiday" \| "other"`. |
| `note` | string or null | no | Plain-text annotation. Omit the key entirely when null — do NOT emit `"note": null`. |
| `source` | string | yes | Enum: `"local" \| "bamboo" \| "merged"`. `"local"` = hand-added via `log-vacation add`. `"bamboo"` = imported by `sync` from BambooHR and not yet locally modified. `"merged"` = set by the vacation-store connector when `overlap_strategy="merge"` is applied and the two sources differ (canonical write-time trigger). Also set by `update_entry` when editing a `"bamboo"` entry locally (local-edit trigger). |
| `created_at` | string | yes | ISO-8601 UTC timestamp. Set once on `add_entry`. MUST NOT change on subsequent writes. |
| `updated_at` | string | yes | ISO-8601 UTC timestamp. Updated on every write to the entry. |
| `external_ref` | object | no | Omit key entirely when no external reference exists. MUST NOT emit `{}` or `null`. Sub-field: `bamboo_id` (string) — the BambooHR request id, carried from `TimeOff.external_ref.bamboo_id` during `sync`. |

### Worked example

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "from": "2026-07-14",
  "to": "2026-07-25",
  "reason": "vacation",
  "note": "Summer break",
  "source": "bamboo",
  "created_at": "2026-04-26T08:00:00Z",
  "updated_at": "2026-04-26T08:00:00Z",
  "external_ref": { "bamboo_id": "42" }
}
```

Entry with no `note` and no `external_ref` (both keys omitted):

```json
{
  "id": "e5f6a7b8-0000-0000-0000-000000000000",
  "from": "2026-05-03",
  "to": "2026-05-03",
  "reason": "sick",
  "source": "local",
  "created_at": "2026-04-26T09:15:00Z",
  "updated_at": "2026-04-26T09:15:00Z"
}
```

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

## Migration policy

On load, the connector checks `version` against the current version (1). If `version < current_version`, the skill runs an upgrade pipeline in-place and auto-backs up the original file to `vacations.v{old}.json.bak` before writing.

**v1 (current):** No migration needed. The file is valid as-is.

Future version bumps MUST add a migration step to this section describing the transformation applied and the fields added, removed, or renamed. The migration MUST be idempotent: running it twice on the same file MUST produce the same result. See `pipeline.md` (Task 17) for the upgrade pipeline interface.

## Overlap resolution policies

### `merge`

Extends the existing entry's date range to cover the union of both spans. Existing `id` and `created_at` are preserved; `updated_at` advances to `Single now`. Candidate `note` and `external_ref` replace existing values when present in candidate; absent candidate fields leave existing values intact. `source` becomes `"merged"` when the two sources differ.

**Before:**
```json
{ "id": "aaa-111", "from": "2026-07-14", "to": "2026-07-20", "reason": "vacation",
  "source": "local", "created_at": "2026-04-01T10:00:00Z", "updated_at": "2026-04-01T10:00:00Z" }
```

Candidate: `{ "from": "2026-07-18", "to": "2026-07-25", "reason": "vacation", "source": "bamboo", "external_ref": { "bamboo_id": "99" } }`

**After:**
```json
{ "id": "aaa-111", "from": "2026-07-14", "to": "2026-07-25", "reason": "vacation",
  "source": "merged", "created_at": "2026-04-01T10:00:00Z", "updated_at": "2026-04-26T08:00:00Z",
  "external_ref": { "bamboo_id": "99" } }
```

### `replace`

Deletes the existing entry and inserts the candidate. The candidate's `id` survives (or a fresh UUIDv4 is assigned if absent); `created_at` is set to the current `Single now`.

**Before:**
```json
{ "id": "aaa-111", "from": "2026-07-14", "to": "2026-07-20", "reason": "vacation",
  "source": "local", "created_at": "2026-04-01T10:00:00Z", "updated_at": "2026-04-01T10:00:00Z" }
```

Candidate with no `id` (connector assigns a fresh UUIDv4): `{ "from": "2026-07-14", "to": "2026-07-25", "reason": "sick", "source": "local" }`

**After** (`id` is new; `created_at` is the current `Single now`, NOT the deleted entry's timestamp):
```json
{ "id": "<new-UUIDv4>", "from": "2026-07-14", "to": "2026-07-25", "reason": "sick",
  "source": "local", "created_at": "2026-04-26T08:00:00Z", "updated_at": "2026-04-26T08:00:00Z" }
```

When the candidate already carries an `id`, that `id` survives into the after-block unchanged.

### `cancel`

Aborts the write. Returns the canonical envelope with no entry written, `data.warnings` populated with the conflict description, and `data.entry` omitted entirely. The existing entry is returned unchanged.

**Before:**
```json
{ "id": "aaa-111", "from": "2026-07-14", "to": "2026-07-20", "reason": "vacation",
  "source": "local", "created_at": "2026-04-01T10:00:00Z", "updated_at": "2026-04-01T10:00:00Z" }
```

Candidate: `{ "from": "2026-07-18", "to": "2026-07-25", "reason": "vacation" }` with `overlap_strategy="cancel"`

**After:** no write. `data.warnings` contains the overlap message. `data.entry` is absent.

## Conflict annotation rules for `list`

**Overlap vs conflict distinction.** An *overlap* is detected at write time and handled immediately by `overlap_strategy` (see §Validation rules). A *conflict* is the result of two entries coexisting in the store with overlapping spans — this can happen when entries were imported via different paths that bypassed overlap detection, or when a merge was deferred. The `list` output surfaces conflicts visually; no automatic resolution is performed.

A conflict exists when two entries share overlapping date spans (`[a.from, a.to]` intersects `[b.from, b.to]`) AND have different `source` values (e.g. one `"local"`, one `"bamboo"`). Different `reason` values are NOT required — two entries from different sources covering the same dates are a conflict regardless of whether the reason matches, because the provenance disagreement itself is actionable.

The `list` subcommand SHOULD annotate both conflicting rows with `⚠` in the output table. No automatic resolution is performed — the user MUST explicitly invoke `remove` or `add` with an `overlap_strategy` to resolve the conflict.

Example `list` output with a conflict:

```
id        | from       | to         | days | reason   | source | note
--------- | ---------- | ---------- | ---- | -------- | ------ | ----
⚠ aaa-111 | 2026-07-14 | 2026-07-20 | 7    | vacation | local  | —
⚠ bbb-222 | 2026-07-18 | 2026-07-25 | 8    | sick     | bamboo | —
```

## Backup / recovery

### Corrupt file on load

If `vacations.json` fails JSON parse, the vacation-store connector MUST:

1. Rename the corrupt file to `vacations.json.bak.<ISO-8601-UTC>` (e.g. `vacations.json.bak.2026-04-26T08-00-00Z`).
2. Create a fresh `{ "version": 1, "entries": [] }` at `vacations.json`.
3. Surface a user-visible warning in `data.warnings`.

Multiple `.bak.*` files MAY accumulate; the connector MUST NOT reap them. The user inspects backups manually.

### Migration backup

On a version upgrade (see §Migration policy), the connector writes the pre-upgrade file to `vacations.v{old}.json.bak` before applying the in-place migration. This file is also never reaped automatically.

### Write protocol

Writes use the `Atomic writes` rule from `idempotency.md`: write to `vacations.json.tmp`, fsync, rename over the target. This prevents partial writes from corrupting the store.
