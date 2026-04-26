# jira-worklog connector reference

This connector is a thin wrapper over `jira.md` and satisfies the sink-connector contract in `connector-pattern.md`. It writes worklog entries to Jira and reads existing worklogs solely for duplicate detection prior to write. It consumes the `Worklog` entity schema defined in `jira.md` §Output shape.

## Class

Class: `sink`. Writes worklog entries to Jira. Per `connector-pattern.md` §Class, a `sink` connector MUST NOT be invoked without explicit confirmation from the caller. The caller is responsible for obtaining that confirmation before any `create_worklog` call.

## Probe order

Inherits from `jira.md` §Probe order in full. This connector has no independent probe sequence. If `jira` is unavailable at every layer, `jira-worklog` is unavailable too. Apply the stopping rules from `jira.md` §Probe order without modification. The transport layer (`mcp` / `cli` / `rest`) and the API version (Cloud REST v3 vs on-prem REST v2) follow the selection rule documented in `jira.md` §Probe order.

## Auth

Inherits from `jira.md` §Auth. No additional environment variables are introduced. Apply credential masking per `connector-pattern.md` §Auth.

## Capabilities

**read: true** (limited; for duplicate detection only)

- `list_worklogs(issue_key, author_email?, date?)` — returns existing `Worklog` records on the given issue, optionally filtered by author email and calendar date. Used exclusively to satisfy the idempotency check defined in `idempotency.md` (existing-worklogs source-of-truth rule) before a `create_worklog` call.

**write: true**

- `create_worklog(issue_key, started_at, duration_minutes, comment)` — creates a single worklog entry on `issue_key` and returns the normalized `Worklog`.

**Entities:** `worklog`.

**Pagination:** inherits from `jira.md` §Capabilities.

**Rate-limit policy:** inherits from `jira.md` §Capabilities.

### Native endpoint mapping

The connector layer is selected by `jira.md` §Probe order; the API version follows the same selection rule.

**Cloud (REST v3):** `POST /rest/api/3/issue/{key}/worklog` with body:

```json
{
  "timeSpentSeconds": <duration_minutes * 60>,
  "started": "<ISO-8601 with timezone>",
  "comment": <ADF document>
}
```

Cloud REQUIRES the `comment` field as Atlassian Document Format. Wrap a plain string `s` using exactly this shape:

```json
{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"<s>"}]}]}
```

**On-prem (REST v2):** `POST /rest/api/2/issue/{key}/worklog` with body:

```json
{
  "timeSpentSeconds": <duration_minutes * 60>,
  "started": "<ISO-8601 with timezone>",
  "comment": "<plain string>"
}
```

On-prem accepts `comment` as a plain string; ADF wrapping MUST NOT be applied.

For `list_worklogs`, use `GET /rest/api/{2|3}/issue/{key}/worklog` (already declared in `jira.md` §Capabilities). On Cloud, ADF comment bodies in the response MUST be flattened to plain text per `jira.md` §Output shape (Worklog).

## Output shape

Every response MUST be wrapped in the normalized envelope from `connector-pattern.md` §Output shape. `connector` is `"jira-worklog"`; `kind` is `"worklog"`.

**`create_worklog` response:** `data` is a single normalized `Worklog` (schema in `jira.md` §Output shape — Worklog). Do not redefine.

```json
{
  "kind": "worklog",
  "source": "mcp | cli | rest",
  "connector": "jira-worklog",
  "timestamp": "<ISO-8601 UTC>",
  "data": { /* Worklog */ }
}
```

**`list_worklogs` response:** `data` carries the request key triple alongside the result array. Envelope `kind` is `"worklog-batch"` (mirroring the `work-event-batch` convention in `jira-activity.md` for batch-shaped responses); single-result `create_worklog` keeps `kind: "worklog"`.

```json
{
  "kind": "worklog-batch",
  "source": "mcp | cli | rest",
  "connector": "jira-worklog",
  "timestamp": "<ISO-8601 UTC>",
  "data": {
    "issue_key": "PROJ-123",
    "author_email": "user@example.com",
    "date": "YYYY-MM-DD",
    "worklogs": [ /* Worklog[] */ ]
  }
}
```

`data.author_email` and `data.date` MUST mirror the request arguments; when the corresponding argument is omitted, the field MUST be omitted (do not emit `null`).

## Error taxonomy

Inherits from `jira.md` §Error taxonomy in full. One connector-specific override applies:

- `403` on a worklog endpoint typically means time tracking is disabled on the project. Map it to `auth` (same canonical code as the generic `403 → auth` mapping in `connector-pattern.md` §Error taxonomy) but override the `message`/`detail` hint to: `"Time tracking may be disabled for <project>"`. This is a deliberate connector-aware override of the generic hint, not a contradiction of the canonical code mapping.

## Fallback rules

Inherits from `jira.md` §Fallback rules in full. No modifications.

## Forbidden behaviors

In addition to `connector-pattern.md` §Forbidden behaviors, this connector:

- MUST NOT edit existing worklogs. `PUT /rest/api/{2|3}/issue/{key}/worklog/{id}` is out of scope.
- MUST NOT delete worklogs. `DELETE /rest/api/{2|3}/issue/{key}/worklog/{id}` is out of scope.
- MUST NOT mutate any non-worklog Jira state. This connector is a sink for worklogs only.

## Idempotency

Every `create_worklog(issue_key, started_at, duration_minutes, comment)` call MUST be preceded by a `list_worklogs(issue_key, author_email, date)` lookup, where `date` is the calendar date of `started_at` and `author_email` is the authenticated user's email. The duplicate-key triple `(issue_key, author_email, date)` and the no-op / new-entry decision are governed by the rules defined in `idempotency.md`; do not redefine them here. The connector MUST NOT delete or rewrite existing worklogs under any condition.
