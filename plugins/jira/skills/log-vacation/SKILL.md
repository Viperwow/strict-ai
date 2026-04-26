---
name: log-vacation
description: Manage vacation / time-off entries for the current user. Supports list, add, remove, and sync (pull from BambooHR when available and merge with local JSON store). Produces deterministic output and a local source-of-truth that log-work consumes to gate the missing-days catch-up. Use when the user runs /jira:log-vacation, asks to record vacation, update time-off, check which dates are already marked off, or sync from BambooHR.
---

# log-vacation

## Prerequisite

This skill depends on two connector references. The local store is documented in `plugins/misc/skills/integrations/references/vacation-store.md` (class `aux`, read-write, local-disk only via `${CLAUDE_PLUGIN_DATA}/vacations.json`). BambooHR is documented in `plugins/misc/skills/integrations/references/bamboohr.md` (class `aux`, read-only, probe MCP → CLI → REST). The vacation-store connector is always available and MUST be resolved on every subcommand. The BambooHR connector is probed ONLY when the `sync` subcommand is invoked; all other subcommands MUST NOT probe BambooHR. Auth or availability failures in the vacation-store MUST stop execution immediately. Auth or availability failures in BambooHR during `sync` MUST stop execution and surface the error; silent fallthrough is forbidden per `bamboohr.md` §Error taxonomy.

## Invocation

```
/jira:log-vacation [list|add|remove|sync] [args]
```

Default subcommand: `list` (invoked when no subcommand is given).

## Parameters

### `list`

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `from` | no | `now-90d` | Start of window (YYYY-MM-DD) |
| `to` | no | `now+180d` | End of window (YYYY-MM-DD) |

Shorthand: `window=<from>,<to>` sets both fields in one argument.

### `add`

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `from` | yes | — | First day of absence (YYYY-MM-DD) |
| `to` | yes | — | Last day of absence (YYYY-MM-DD); equals `from` for a single day |
| `reason` | no | `vacation` | Enum: `vacation \| sick \| holiday \| other` |
| `note` | no | — | Free-text annotation; stored as-is |
| `overlap_strategy` | no | prompt | Enum: `merge \| replace \| cancel`; if absent and an overlap exists, the skill prompts interactively |

### `remove`

| Parameter | Required | Description |
|-----------|----------|-------------|
| `id` | at least one of `id` or `from` | UUIDv4 of the entry to remove |
| `from` | at least one of `id` or `from` | Start of date range; removes all entries whose `[from, to]` overlaps the given range |
| `to` | no (paired with `from`) | End of date range; defaults to `from` when omitted (single-day range) |

### `sync`

No parameters. Window is fixed: `now-1y` to `now+1y`.

## Phases

### Phase 0 — Resolve connectors

Resolve the vacation-store connector first. If the connector returns `unsupported` (e.g. `${CLAUDE_PLUGIN_DATA}` missing or unwritable), surface the error and stop. If the subcommand is `sync`, probe the BambooHR connector next using its declared probe order (MCP → CLI → REST); an `auth` or `network` error MUST stop execution immediately and surface the error — do NOT fall through or continue as a no-op. Record the resolved layer for each connector in the trailing `Source:` line of the output.

### Phase 1 — Execute subcommand

**`list`**

Call `vacation_store.list_entries()` to retrieve the full entry set. Filter the result to entries where `[entry.from, entry.to]` intersects the resolved `[from, to]` window; both bounds default to `now-90d` / `now+180d` per the `Single now` rule from `idempotency.md`. Render the matching entries as a table (see Output contract) and append the `Source:` and `Generated:` footer lines.

**`add`**

Validate that `from <= to` (lexicographic) before calling the connector; surface a clear error and stop if the check fails. Call `vacation_store.add_entry(entry)` with `source="local"`. If the connector returns a conflict (overlap detected) and no `overlap_strategy` was supplied, prompt the user interactively: `Overlap with existing entry <id> (<from>–<to>). [m]erge / [r]eplace / [c]ancel?`; map the single-character response to the strategy and retry. Confirm the write result with a single `Added:` line before returning.

**`remove`**

Resolve matching entries: if `id` is supplied, find the entry with that id; if `from` (and optionally `to`) is supplied, find all entries whose `[from, to]` intersects the given range. If the resolved set is empty, print `Removed: 0 (not found)` and stop (no-op). Otherwise prompt `Remove N entry(ies)? [y/N]` and proceed only on affirmative. Call `vacation_store.remove_entry(id)` for each matched entry sequentially and print the consolidated result.

**`sync`**

Call `bamboohr.time_off_requests(from=now-1y, to=now+1y)` to retrieve approved time-off requests. Map each `TimeOff` to a `VacationEntry`: set `source="bamboo"`, copy `from`, `to`, `note`, and `external_ref.bamboo_id`; map `TimeOff.reason` → `VacationEntry.reason` using the reason table in `bamboohr.md` §Reason mapping (note: BambooHR `"personal"` has no direct `VacationEntry` enum value; map it to `"other"`). Call `vacation_store.add_entry(entry, overlap_strategy="merge")` for each mapped entry. Accumulate counts from connector responses: entries with `data.entry` present → added or merged; entries with `data.entry` absent and `data.warnings` non-empty → skipped. Print the summary line on completion.

## Output contract

All timestamps derive from the single `now` captured at skill start per the `Single now` rule from `idempotency.md`. Missing optional cells MUST render as `—` (em-dash, U+2014).

**`list`**

```
id        | from       | to         | days | reason   | source | note
--------- | ---------- | ---------- | ---- | -------- | ------ | ----
<short-id>| YYYY-MM-DD | YYYY-MM-DD | N    | vacation | local  | —

Source: vacation-store=local-fs
Generated: <ISO-8601 UTC>
```

`id` is the first 8 characters of the UUIDv4. `days` is `(to - from).days + 1` (inclusive). Sort: ascending `from`, then ascending `id` as tie-breaker (stable, deterministic per idempotency rule 3).

**`add`**

```
Added: <full-uuid> <from>–<to> (<reason>)
```

**`remove`**

```
Removed: N entry(ies)
```

or

```
Removed: 0 (not found)
```

**`sync`**

```
Synced from BambooHR: +N added, N skipped, N merged
```

or, on connector failure:

```
BambooHR unavailable: <error message>
```

## Idempotency

Three explicit rules govern mutation safety:

1. **`add` duplicate detection.** The duplicate-detection key is the tuple `(from, to, reason)`. If `vacation_store.add_entry()` detects a matching tuple, the connector returns the existing entry with a warning in `data.warnings`; this skill MUST surface the warning (`Warning: duplicate entry <id>, no write performed`) and return the existing `id` — it MUST NOT write a second copy.

2. **`remove` nonexistent id.** If `vacation_store.remove_entry(id)` returns `removed: false`, the skill MUST treat it as a no-op and emit `Warning: entry <id> not found, nothing removed`. The skill MUST NOT error out.

3. **`sync` unchanged remote.** Each BambooHR entry is mapped and submitted with `overlap_strategy="merge"`. If the connector detects the entry is already present and identical (same `from`, `to`, `reason`, `external_ref.bamboo_id`), it returns `data.warnings` indicating no change; the skill counts that entry as `skipped`. A `sync` run against an unchanged BambooHR produces zero writes to `vacations.json`.

## Error handling

| Condition | Behavior |
|-----------|----------|
| `vacation-store` returns `unsupported` | Surface the connector error verbatim, suggest checking `${CLAUDE_PLUGIN_DATA}`, and stop. Do NOT continue with any subcommand. |
| `bamboohr` returns `auth` during `sync` | Surface the error, suggest re-checking `BAMBOOHR_API_KEY` (masked per connector-pattern §Auth), and stop. MUST NOT fall through silently. |
| `bamboohr` returns `unsupported` during `sync` | Emit `Warning: BambooHR unavailable — sync skipped` and complete the subcommand as a no-op (no writes, counts all zero). Continue without error exit. |
| `vacations.json` fails JSON parse | The vacation-store connector auto-renames the corrupt file to `vacations.json.bak.<ISO-8601-UTC>`, starts fresh with `{ "version": 1, "entries": [] }`, and returns the warning in `data.warnings`. This skill MUST surface that warning verbatim before proceeding. |

## Integration contract with log-work

`log-work` calls `vacation_store.list_entries()` in read-only mode to determine which calendar days are already marked as vacation or time-off, and skips those days during catch-up worklog generation. This skill (`log-vacation`) is the sole writer to `vacations.json`; `log-work` MUST NOT call `add_entry`, `update_entry`, or `remove_entry` under any circumstance.

## Examples

**Default list (last 90 days to next 180 days):**
```
/jira:log-vacation
```

**List with explicit window:**
```
/jira:log-vacation list from=2026-01-01 to=2026-12-31
```

**Add a vacation block:**
```
/jira:log-vacation add from=2026-07-14 to=2026-07-25 reason=vacation note="Summer break"
# → Added: a1b2c3d4-... 2026-07-14–2026-07-25 (vacation)
```

**Add a single sick day (`from` equals `to`):**
```
/jira:log-vacation add from=2026-05-03 to=2026-05-03 reason=sick
# → Added: e5f6a7b8-... 2026-05-03–2026-05-03 (sick)
```

**Add with overlap — user cancels:**
```
/jira:log-vacation add from=2026-07-20 to=2026-07-30 reason=vacation
# → Overlap with existing entry a1b2c3d4 (2026-07-14–2026-07-25). [m]erge / [r]eplace / [c]ancel? c
# → Cancelled. No entry written.
```

**Remove by id:**
```
/jira:log-vacation remove id=e5f6a7b8-0000-0000-0000-000000000000
# → Remove 1 entry(ies)? [y/N] y
# → Removed: 1 entry(ies)
```

**Remove by date range:**
```
/jira:log-vacation remove from=2026-07-01 to=2026-07-31
# → Remove 1 entry(ies)? [y/N] y
# → Removed: 1 entry(ies)
```

**Sync from BambooHR (reachable):**
```
/jira:log-vacation sync
# → Synced from BambooHR: +3 added, 1 skipped, 0 merged
```

**Sync with auth failure:**
```
/jira:log-vacation sync
# → BambooHR unavailable: auth — Authentication failed or permission denied.
# →   Hint: re-check BAMBOOHR_API_KEY (current value: AT…3x).
```
