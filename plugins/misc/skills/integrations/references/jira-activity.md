# jira-activity connector reference

This connector is a thin wrapper over `jira.md` and satisfies the source-connector contract in `connector-pattern.md`. It produces normalized `WorkEvent` records per day from Jira issue activity (status changes, comments, field edits), and is consumed by `log-work` to suggest issues against which time should be logged.

## Class

Class: `source`. Produces normalized `WorkEvent` records per day from Jira issue activity; used by `log-work` to suggest issues to log time against.

## Probe order

Inherits from `jira.md` in full. This connector has no independent probe sequence. If `jira` is unavailable at every layer, `jira-activity` is unavailable too. Apply the stopping rules from `jira.md` §Probe order without modification.

## Auth

Inherits from `jira.md` §Auth. Do not duplicate environment variables here. Apply credential masking per `connector-pattern.md` §2.3.

## Capabilities

**read-only** (no write operations).

Operations:

- `events_for(date, assignee=currentUser, project)` — returns all `WorkEvent` records for a single calendar date.
- `events_for_range(from, to, assignee, project)` — returns all `WorkEvent` records across an inclusive date range; calls `events_for` per day internally.

Pagination and rate-limit handling inherit from `jira.md` §Capabilities without modification.

## Output shape

Returns an array of `WorkEvent` objects. Each element represents one discrete activity on a Jira issue that falls within the requested date window and is attributed to the specified assignee.

### WorkEvent

```json
{
  "date": "YYYY-MM-DD",
  "source": "jira-activity",
  "kind": "status-change | comment | assignment | field-edit",
  "issue_key": "PROJ-123",
  "summary": "short human-readable (issue summary + event delta)",
  "raw_weight": 3.0,
  "metadata": { "from": "...", "to": "...", "author": "...", "change_id": "..." }
}
```

`summary` MUST be a single human-readable string combining the issue summary and a brief description of the change (e.g. `"PROJ-123 Fix login bug — status: In Progress → Done"`). `metadata` fields are populated where available; omit keys that have no value rather than emitting `null`.

## Event derivation

### JQL template

Use the following JQL to retrieve candidate issues. The template is copy-pasteable; substitute placeholders before executing.

```
assignee = <assignee> AND updated >= "<date>" AND updated < "<date+1>" AND project = <project>
```

`<date>` and `<date+1>` are ISO-8601 calendar dates (`YYYY-MM-DD`). `<date+1>` is `<date>` plus one day.

### Changelog events

For each issue returned by the JQL query, fetch its changelog:

```
GET /issue/{key}/changelog
```

(Use the `jira` connector; layer selection follows `jira.md` §Probe order.)

Filter history entries where `created` falls within `[<date>T00:00:00Z, <date+1>T00:00:00Z)` AND `author` equals the assignee. Each matching history entry produces one `WorkEvent` as follows:

- `items[].field == "status"` → `kind=status-change`, `raw_weight=3`. Set `metadata.from` and `metadata.to` from `items[].fromString` / `items[].toString`.
- `items[].field == "assignee"` and the new value equals the current user → `kind=assignment`, `raw_weight=2`. Do NOT also emit a `field-edit` for this item; assignment changes are emitted exclusively as `kind=assignment`.
- `items[].field` ∈ `{"priority", "sprint"}` → `kind=field-edit`, `raw_weight=2`. Set `metadata.from` / `metadata.to` accordingly.
- All other fields: skip silently.

### Comment events

For each issue, fetch comments:

```
GET /issue/{key}/comment
```

Filter by `created` within the date window AND `author` equals the assignee. Each matching comment → `kind=comment`, `raw_weight=1`. Set `metadata.change_id` to the comment `id`.

### Kind → weight defaults

| kind          | default raw_weight |
|---------------|--------------------|
| status-change | 3                  |
| comment       | 1                  |
| assignment    | 2                  |
| field-edit    | 2                  |

Weights are tunable via `log-work` configuration (forward reference: `plugins/jira/skills/log-work/references/config-schema.md`). The values above are the defaults documented at the connector level.

## Error taxonomy and fallback

Inherits from `jira.md` §Error taxonomy and `jira.md` §Fallback rules in full. This connector has no independent error-handling layer; all error handling delegates to `jira.md`. Do not duplicate the error table here.

## Idempotency

Jira changelog entries are monotonic: once written, Jira does not mutate or delete them. Re-running `events_for` on the same `(date, assignee, project)` triple produces an identical array. Comments are append-only in practice; a re-run on a closed date window yields the same set. Consumers MUST follow the determinism rules defined in `idempotency.md` to ensure downstream operations (e.g. worklog creation) remain safe under retries.
