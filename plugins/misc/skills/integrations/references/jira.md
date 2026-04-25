# jira connector reference

This file defines the Jira core connector and satisfies the contract specified in `connector-pattern.md`. All shared rules (masking, rate-limit backoff, error taxonomy, normalization envelope) are cited by section; they are not duplicated here.

## Class

Class: `aux`. This connector provides supporting reads (issue lookup, worklog list, sprint list, field metadata) and targeted writes (issue create, label mutation, worklog add); it is not a primary event source.

## Probe order

Attempt layers in this order; stop at first success.

1. **Atlassian MCP** — check the available tool list for any tool whose name matches `mcp__*atlassian*__*`. If at least one match is found, use MCP exclusively for all operations.

2. **Atlassian CLI `acli`** — run `acli --version`. If exit code is `0`, use `acli` exclusively. Use `--json` flag on all sub-commands that support it; discard human-readable output.

3. **Jira Cloud REST v3** — send `GET /rest/api/3/myself` with Basic auth credentials. If the response is `200`, the endpoint is Jira Cloud v3. Pagination uses `nextPageToken`. Issue search uses `POST /rest/api/3/search/jql`.

4. **Jira Server / Data Center REST v2** — send `GET /rest/api/2/serverInfo`. If the response is `200` and the body field `deploymentType` is `Server` or `DataCenter`, or the OpenAPI schema only exposes `/rest/api/2/`, the endpoint is Jira Server / Data Center (Jira 9.x+). Pagination uses `startAt` / `maxResults`. Issue search uses `POST /rest/api/2/search`.

Stopping rules from `connector-pattern.md` §Probe order apply: an `auth` or `network` failure at any layer MUST stop probing immediately. Silent downgrade is forbidden; every layer transition MUST be recorded.

## Auth

Credentials MUST be read exclusively from environment variables.

**Cloud:**
- `JIRA_BASE_URL` — e.g. `https://myorg.atlassian.net`
- `JIRA_EMAIL` — Atlassian account email
- `JIRA_API_TOKEN` — Atlassian API token

Basic auth header: `Authorization: Basic <base64(JIRA_EMAIL:JIRA_API_TOKEN)>`

**On-premises (Server / Data Center):**
- `JIRA_BASE_URL` — base URL of the Jira instance
- `JIRA_PAT` — Personal Access Token

Bearer header: `Authorization: Bearer $JIRA_PAT`

**Masking:** apply the masking rules defined in `connector-pattern.md` §Auth (key pattern match, first-2…last-2 characters). Do not duplicate the regex here.

## Capabilities

**read: true**

- Issue search via JQL
- Issue get by key
- Issue changelog get
- Field metadata get (resolves custom field IDs)
- Sprint list: `GET /rest/agile/1.0/board/{id}/sprint`
- Priority list
- Project list
- Worklog list per issue: `GET /rest/api/{2|3}/issue/{key}/worklog`

**write: true**

- Issue create: `POST /rest/api/{2|3}/issue`
- Label add / remove: `PUT /rest/api/{2|3}/issue/{key}`
- Worklog add: `POST /rest/api/{2|3}/issue/{key}/worklog`

**Entities:** `issue`, `worklog`, `sprint`, `field-metadata`

**Pagination:**
- Cloud (REST v3): `nextPageToken` in response body; pass as query param `nextPageToken` on subsequent requests.
- On-premises (REST v2): `startAt` + `maxResults` offset-based. Default page size: 50.

**Rate-limit policy:** cite `connector-pattern.md` §Capabilities (1 s / 2 s / 4 s × 3 attempts, then stop). Jira Cloud `429` responses include a `Retry-After` header; honor it when present instead of the fixed schedule.

## Output shape

Every response MUST be wrapped in the normalized envelope from `connector-pattern.md` §Output shape before being returned:

```json
{
  "kind": "<entity-type>",
  "source": "<mcp | cli | rest>",
  "connector": "jira",
  "timestamp": "<ISO-8601 UTC>",
  "data": {}
}
```

The `data` field contains one of the entity schemas below. Consumers MUST NOT inspect `source` to infer transport.

### Issue

```json
{
  "key": "PROJ-123",
  "summary": "string",
  "status": {
    "name": "string",
    "category": "string"
  },
  "priority": {
    "name": "string",
    "rank": "string"
  },
  "issuetype": "string",
  "created": "ISO-8601",
  "updated": "ISO-8601",
  "duedate": "ISO-8601 | null",
  "labels": ["string"],
  "parent": {
    "key": "string",
    "summary": "string"
  },
  "sprint": {
    "id": "integer",
    "name": "string",
    "state": "active | closed | future",
    "startDate": "ISO-8601",
    "endDate": "ISO-8601"
  },
  "flagged": "string | null",
  "links": [
    {
      "type": {
        "inward": "string",
        "outward": "string"
      },
      "target": {
        "key": "string",
        "status": "string",
        "created": "ISO-8601"
      }
    }
  ]
}
```

`parent` and `sprint` are optional fields (omitted when absent). Native fields with no mapping MUST be dropped silently per `connector-pattern.md` §Normalization principle.

### Worklog

```json
{
  "id": "string",
  "author_email": "string",
  "issue_key": "string",
  "started_at": "ISO-8601",
  "duration_minutes": "integer",
  "comment": "string"
}
```

`comment` is always plain text. On read, the connector MUST flatten Atlassian Document Format (ADF) comment bodies from Cloud responses to plain text before returning. On write, callers pass plain text; the connector MUST wrap it in ADF for Cloud (`POST /worklog`) and pass it as plain text for on-premises.

### Sprint

```json
{
  "id": "integer",
  "name": "string",
  "state": "active | closed | future",
  "startDate": "ISO-8601",
  "endDate": "ISO-8601",
  "boardId": "integer"
}
```

### FieldMetadata

```json
{
  "id": "string",
  "name": "string",
  "schema": {
    "type": "string",
    "custom": "string"
  }
}
```

Used to resolve opaque custom field IDs such as `customfield_10020` (sprint) and `customfield_10021` (flagged) on on-premises instances. `schema.custom` is omitted when the field is a standard Jira field.

## Error taxonomy

Apply the canonical error codes and error object shape from `connector-pattern.md` §Error taxonomy. Do not duplicate the table here.

**Jira-specific note:** some Jira Cloud tenants return `404` on the legacy `POST /rest/api/3/search` path. MUST use `POST /rest/api/3/search/jql` exclusively for Cloud; never fall back to the legacy path.

## Fallback rules

| Error code | Action |
|---|---|
| `auth` | Stop immediately. MUST NOT try the next layer. |
| `network` | Stop immediately. MUST NOT try the next layer. |
| `not-found` (entity) | Stop. The resource is absent; do not fall through. |
| `not-found` (endpoint) | Try the next layer in probe order. Record the transition. |
| `unsupported` | Try the next layer in probe order. If no layer supports the operation, stop and surface `unsupported` to the caller. |
| `rate-limited` | Apply backoff at the current layer per `connector-pattern.md` §Capabilities. If retries are exhausted, stop. MUST NOT fall through to a different layer. |
| `server` | MAY retry within the same layer subject to rate-limit policy. MUST NOT fall through. |
| `client` | Stop. The request is invalid; do not fall through. |

## Tool-resolution caching

The resolved layer for each `JIRA_BASE_URL` MUST be recorded in `${CLAUDE_PLUGIN_DATA}/field-ids.json` (created by the `check-status` skill). The cache entry format:

```json
{
  "jira": {
    "<JIRA_BASE_URL>": {
      "layer": "mcp | cli | rest-v3 | rest-v2",
      "resolved_at": "ISO-8601 UTC"
    }
  }
}
```

Re-probe conditions (invalidate cached layer and run probe order again):

- An `auth` error is returned by the cached layer.
- The cached entry is older than 24 hours (`resolved_at` + 86400 s < now).

Between re-probe events, the cached layer MUST be used without re-running the probe sequence.
