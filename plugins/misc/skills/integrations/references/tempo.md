# tempo connector reference

This connector defines the Tempo worklog sink and satisfies the sink-connector contract in `connector-pattern.md`. Tempo is the **primary** worklog sink in the system; `jira-worklog` is its fallback, not the other way around. It consumes the `Worklog` entity schema defined in `jira.md` §Output shape — this file does not redefine it.

## Class

Class: `sink`. Writes worklog entries to Tempo. Per `connector-pattern.md` §Class, a `sink` connector MUST NOT be invoked without explicit confirmation from the caller. The caller is responsible for obtaining that confirmation before any `create_worklog` call.

## Probe order

This connector has its OWN probe sequence, independent of `jira.md`. Attempt layers in this order; stop at first success.

1. **Tempo MCP** — check the available tool list for any tool whose name matches `mcp__*tempo*__*`. If at least one match is found, layer = `mcp` and use MCP exclusively for all operations.

2. **Tempo REST v4 (Cloud)** — send `GET https://api.tempo.io/4/worklogs?limit=1` with header `Authorization: Bearer ${TEMPO_API_TOKEN}`. If response status is `200`, layer = `rest` (Cloud variant).

3. **Tempo Server REST (Tempo Timesheets DC)** — send `GET ${JIRA_BASE_URL}/rest/tempo-timesheets/4/worklogs?limit=1` with header `Authorization: Bearer ${JIRA_PAT}`. If response status is `200`, layer = `rest` (Server variant).

There is no CLI layer for Tempo in v1.

Stopping rules from `connector-pattern.md` §Probe order apply: an `auth` or `network` failure at any layer MUST stop probing immediately and escalate to the caller — MUST NOT proceed to the next layer. Silent downgrade is forbidden; every layer transition MUST be recorded.

## Auth

Credentials MUST be read exclusively from environment variables. The active scheme is selected by which probe layer succeeded, per the credential-layering rule in `connector-pattern.md` §Auth.

**Cloud (REST v4):**
- `TEMPO_API_TOKEN` — Tempo-issued OAuth/API token.

Header: `Authorization: Bearer ${TEMPO_API_TOKEN}`.

**Server (Tempo Timesheets DC):**
- `JIRA_BASE_URL` — base URL of the Jira instance hosting Tempo.
- `JIRA_PAT` — Personal Access Token. Tempo DC reuses Jira's authentication; no separate Tempo credential is issued.

Header: `Authorization: Bearer ${JIRA_PAT}`.

The MCP layer carries credentials per its host runtime; no env var is read directly by this connector when layer = `mcp`. Apply the masking rules from `connector-pattern.md` §Auth to every printed value, log line, and error body.

## Capabilities

**read: true** (limited; for duplicate detection only)

- `list_worklogs(issue_key, author_email, date)` — returns existing `Worklog` records for the given triple. `author_email` is REQUIRED on Tempo (Tempo lists per-author by default). Used exclusively to satisfy the existing-worklogs source-of-truth rule defined in `idempotency.md` before a `create_worklog` call.

**write: true**

- `create_worklog(issue_key, started_at, duration_minutes, comment, billable=true)` — creates a single worklog entry on `issue_key` and returns the normalized `Worklog`. The `billable` argument defaults to `true`. Both Cloud REST v4 and Server (Tempo Timesheets DC) v4 natively support a billable flag; the mapping is documented under Native endpoint mapping below.

**Entities:** `worklog`.

**Pagination:** `offset+limit` per `connector-pattern.md` §Capabilities — `limit` and `offset` query parameters on both Cloud v4 and Server v4.

**Rate-limit policy:** per `connector-pattern.md` §Capabilities (1 s / 2 s / 4 s × 3 attempts, then stop). No connector-specific override.

### Native endpoint mapping

The connector layer is selected by §Probe order above; the API variant follows the same selection.

**Cloud (REST v4):** `POST https://api.tempo.io/4/worklogs` with body:

```json
{
  "issueKey": "<issue_key>",
  "timeSpentSeconds": <duration_minutes * 60>,
  "startDate": "<YYYY-MM-DD>",
  "startTime": "<HH:MM:SS>",
  "description": "<plain string>",
  "authorAccountId": "<accountId>",
  "billableSeconds": <duration_minutes * 60 if billable else 0>
}
```

Cloud v4 splits start into `startDate` and `startTime`. `authorAccountId` resolves per `jira.md` §Capabilities (current-user lookup).

**Server (Tempo Timesheets DC):** `POST ${JIRA_BASE_URL}/rest/tempo-timesheets/4/worklogs` with body:

```json
{
  "issue": { "key": "<issue_key>" },
  "timeSpentSeconds": <duration_minutes * 60>,
  "dateStarted": "<ISO-8601 with timezone>",
  "comment": "<plain string>",
  "worker": "<jira username or accountId>",
  "billableSeconds": <duration_minutes * 60 if billable else 0>
}
```

Server v4 takes a single `dateStarted` ISO-8601 with timezone. `worker` accepts the Jira username (DC) or the Atlassian accountId.

### List endpoint mapping

`list_worklogs(issue_key, author_email, date)` resolves per layer:

- **Cloud:** `GET https://api.tempo.io/4/worklogs?issue=<issue_key>&worker=<accountId>&from=<date>&to=<date>` (use the same `date` for both `from` and `to`).
- **Server:** `POST ${JIRA_BASE_URL}/rest/tempo-timesheets/4/worklogs/search` with a JSON body containing `worker`, `from`, `to`, and `issue` (Tempo DC's canonical list operation is a POST search).

## Output shape

Every response MUST be wrapped in the normalized envelope from `connector-pattern.md` §Output shape. `connector` is `"tempo"`. The `Worklog` schema is defined in `jira.md` §Output shape (Worklog) and is not redefined here.

**`create_worklog` response:** envelope `kind` is `"worklog"`; `data` is a single normalized `Worklog`.

```json
{
  "kind": "worklog",
  "source": "mcp | rest",
  "connector": "tempo",
  "timestamp": "<ISO-8601 UTC>",
  "data": { /* Worklog */ }
}
```

**`list_worklogs` response:** envelope `kind` is `"worklog-batch"`; `data` carries the request triple alongside the result array.

```json
{
  "kind": "worklog-batch",
  "source": "mcp | rest",
  "connector": "tempo",
  "timestamp": "<ISO-8601 UTC>",
  "data": {
    "issue_key": "PROJ-123",
    "author_email": "user@example.com",
    "date": "YYYY-MM-DD",
    "worklogs": [ /* Worklog[] */ ]
  }
}
```

`data.issue_key`, `data.author_email`, and `data.date` MUST mirror the request arguments exactly.

## Error taxonomy

Inherits the canonical taxonomy from `connector-pattern.md` §Error taxonomy in full. This connector is independent of `jira.md`'s taxonomy. No connector-specific overrides for v1.

## Fallback rules

The generic per-error rules from `connector-pattern.md` §Fallback rules apply WITHIN this connector's three layers (MCP → Cloud REST → Server REST).

**Special rule (cross-connector fallthrough):** if `unsupported` is the resolved error at every probe layer (Tempo wholly unavailable), the CALLER MUST fall through to the `jira-worklog` connector. This is the only cross-connector fallthrough in the system. The connector itself MUST surface `unsupported` to the caller; the caller (consumer skill) is responsible for performing the cross-connector fallthrough — `tempo.md` itself MUST NOT call `jira-worklog`.

**Anti-special rule:** the cross-connector fallthrough MUST NOT trigger on `auth` or `network`. Rationale: silent fallthrough on `auth` would mask a misconfigured Tempo token by writing to native Jira worklogs instead, producing duplicate or misattributed entries downstream. (Per-connector `auth`/`network` stopping is already required by `connector-pattern.md` §Probe order; this rule extends it across the connector boundary.)

## Forbidden behaviors

In addition to `connector-pattern.md` §Forbidden behaviors, this connector:

- MUST NOT edit existing worklogs.
- MUST NOT delete worklogs.
- MUST NOT mutate any non-worklog state.

## Idempotency

Every `create_worklog(issue_key, started_at, duration_minutes, comment, billable)` call MUST be preceded by a `list_worklogs(issue_key, author_email, date)` lookup, where `date` is the calendar date of `started_at` and `author_email` is the authenticated user's email. The duplicate-key triple `(issue_key, author_email, date)` and the no-op / new-entry decision are governed by the existing-worklogs source-of-truth rule defined in `idempotency.md`; do not redefine them here. The connector MUST NOT delete or rewrite existing worklogs under any condition.
