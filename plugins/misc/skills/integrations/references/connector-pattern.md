# Connector pattern

## Purpose

A connector is a normalized description of how to interact with one external system, independent of the underlying protocol (MCP tool, CLI binary, or REST endpoint). It defines the contract — auth, capabilities, output shape, and error handling — that consumers depend on. Consumers are written against the connector contract; they MUST NOT contain protocol-specific branching. The active transport layer is resolved at runtime and recorded in the report; switching layers MUST be invisible to the caller.

## Required sections

Every connector reference file MUST include the following sub-sections in this exact order.

### Class

Every connector MUST declare exactly one class:

- `source` — produces normalized day-events for the consumer (e.g. Tempo worklogs, calendar entries). A `source` connector MUST NOT mutate remote state.
- `sink` — accepts and writes structured data (e.g. posting a worklog entry to Jira Tempo). A `sink` connector MUST NOT be invoked without explicit confirmation from the caller.
- `aux` — provides supporting, non-event data: auth-bearing reads, lookup tables, local key-value stores. An `aux` connector MAY be called freely as long as it remains read-only.

### Probe order

The connector MUST attempt layers in the declared order and stop at first success:

1. MCP tool — check for any tool whose name matches `mcp__*<connector-name>*__*`. If found, use it exclusively.
2. CLI binary — verify the binary is on `PATH` with `<binary> --version` (or equivalent probe command). If the exit code is zero, use it exclusively.
3. REST — issue a `HEAD` or `GET /serverInfo` (or equivalent) to the configured base URL. Confirm the response version satisfies the declared minimum. If the probe returns 2xx, use this layer.

Stopping rules:
- Stop at first layer that probes successfully.
- If a layer probe fails with an `auth` or `network` error, MUST NOT proceed to the next layer — escalate the error to the caller immediately.
- Silent downgrade is forbidden. Every layer transition MUST be recorded.

### Auth

Credentials MUST be read exclusively from environment variables. Tokens MUST NOT be stored in memory beyond the duration of one request, and MUST NOT be written to plugin data files or logs.

Required env vars are declared per-connector; typical patterns:

- `JIRA_BASE_URL`, `JIRA_USER`, `JIRA_API_TOKEN` — Jira Cloud (Basic auth: `<email>:<token>` base64)
- `JIRA_PAT` — Jira Data Center (Bearer token)
- `TEMPO_API_TOKEN` — Tempo Cloud

Credential layering: prefer Basic (email + API token) for Cloud instances; prefer Bearer PAT for Data Center instances. The connector MUST detect which auth scheme applies based on the probe result.

Masking rules: any value — in printed output, logs, or error messages — whose key matches the pattern `Authorization|BEARER|TOKEN|PAT|API_KEY` (case-insensitive) MUST be masked. When the value cannot be omitted (e.g. in a debug trace), show the first 2 characters, `…`, and the last 2 characters only (e.g. `AT…3x`).

### Capabilities

Each connector MUST declare:

- `read: true | false` — whether it can retrieve data.
- `write: true | false` — whether it can create or mutate data.
- `entities` — list of entity types handled (e.g. `worklog`, `issue`, `user`, `project`).
- `pagination` — form used: `offset+limit`, `startAt+maxResults`, `cursor`, or `none`.
- `rate-limit policy` — exponential backoff honoring the `Retry-After` response header when present. Fixed schedule when header is absent: wait 1 s, then 2 s, then 4 s. Maximum 3 retry attempts total. After the third failure, stop and surface a `rate-limited` error to the caller. MUST NOT retry indefinitely.

### Output shape

Every connector MUST convert its native response into the following normalized envelope before returning data to the consumer. Consumers MUST NOT parse native shapes.

```json
{
  "kind": "<entity-type>",
  "source": "<layer: mcp | cli | rest>",
  "connector": "<connector-id>",
  "timestamp": "<ISO-8601 UTC>",
  "data": {}
}
```

- `kind` — the entity type string declared in `Capabilities.entities`.
- `source` — the transport layer that produced this result (`mcp`, `cli`, or `rest`).
- `connector` — the connector identifier (matches the file name without extension).
- `timestamp` — ISO-8601 UTC timestamp of when the response was normalized.
- `data` — the entity payload. Its schema is defined per-connector; consumers rely only on this envelope for routing.

The shape MUST be transport-independent: a consumer MUST NOT be able to determine whether data came from MCP, CLI, or REST by inspecting the object.

### Error taxonomy

Every error MUST be mapped to one of the following canonical codes before being surfaced to the caller. The error body MUST be truncated to 200 characters maximum.

```text
Code          HTTP trigger / condition           Human sentence
------------  ---------------------------------  -----------------------------------------------
auth          401, 403                           Authentication failed or permission denied.
not-found     404                                The requested resource does not exist.
rate-limited  429                                Rate limit reached; retries exhausted.
network       timeout, DNS failure, conn reset   Could not reach the remote host.
unsupported   missing endpoint or feature        This operation is not available at this layer.
server        5xx                                The remote server returned an error.
client        other 4xx                          The request was malformed or rejected.
```

Each error object returned to the caller MUST include: `code` (one of the above), `message` (human sentence), `detail` (truncated native body, max 200 chars), and `layer` (the transport layer that produced the error).

### Fallback rules

When a layer returns an error, the connector MUST apply the following rules before attempting the next layer:

- `auth` — MUST bubble up immediately. MUST NOT attempt the next layer.
- `network` — MUST bubble up immediately. MUST NOT attempt the next layer.
- `not-found` — stop; do not fall through (the resource is absent at the authoritative layer).
- `rate-limited` — stop after retries are exhausted; do not fall through to a different layer.
- `server` — MAY retry within the same layer (subject to rate-limit policy); do not fall through to a different layer.
- `unsupported` — MAY fall through to the next layer in probe order. Record the transition.
- `client` — stop; do not fall through (the request itself is invalid).

## Tool resolution rule

At runtime, the consumer MUST resolve the active layer for each connector using this sequence:

1. Check for any tool matching the pattern `mcp__*<connector-name>*__*` in the available tool list. If at least one match exists, the layer is `mcp`.
2. Run `<binary> --version` (where `<binary>` is declared by the connector). If exit code is `0`, the layer is `cli`.
3. Send a `HEAD` or `GET <baseURL>/serverInfo` (or equivalent probe path). If the response is `2xx`, the layer is `rest`.

The resolved layer MUST be recorded in the final report under the key `Source:`. If no layer resolves successfully and the failure is not `auth` or `network`, report `unsupported`.

## Normalization principle

Each connector is solely responsible for converting native API responses — Jira issue objects, Tempo JSON arrays, CSV rows, GraphQL nodes — into the `Output shape` envelope defined above. This conversion MUST happen inside the connector, before data is returned. Consumers MUST receive only normalized envelopes. Consumers MUST NOT contain parsing logic for native shapes. If a native field has no mapping in the output schema, it MUST be dropped silently.

## Forbidden behaviors

Connectors MUST NOT perform any of the following:

- (a) Echo, log, or print any credential token or auth header value without masking per the rules in `Auth`.
- (b) Mutate remote state when declared as a `read`-class or `source`-class connector.
- (c) Perform any write operation without receiving explicit confirmation from the caller first.
- (d) Retry indefinitely; the maximum retry count is 3 (rate-limit policy applies).
- (e) Swallow errors silently; every error MUST be surfaced to the caller using the canonical error taxonomy.
