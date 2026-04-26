# bamboohr connector reference

This connector is the BambooHR `aux` reference for looking up approved time-off requests. It is read-only in v1: the connector MUST NOT mutate any HR state. It is consumed by `log-vacation` to import approved time-off requests into the local vacation store and by `log-work` to skip days the user is on leave during catch-up worklog generation. Light-touch by design — HR data is identity-bound and the connector never writes back.

## Class

Class: `aux`. Per `connector-pattern.md` §Class, aux connectors provide supporting non-event data and MAY be called freely as long as they remain read-only. This connector is a remote read-only connector and never writes back to BambooHR — there is no `write` capability in v1.

## Probe order

This connector has THREE probe layers, attempted in declared order; stop at first success. Apply the stopping rules from `connector-pattern.md` §Probe order verbatim — an `auth` or `network` failure at any layer MUST stop probing immediately and escalate to the caller. Silent downgrade is forbidden; every layer transition MUST be recorded. This connector does NOT replicate the soft-fall-through deviation that `holidays.md` declares for `network`.

1. **mcp** — match the available tool list against `mcp__*bamboo*__*`. If at least one match is found, layer = `mcp` and use MCP exclusively for all operations.
2. **cli** — probe `bamboo --version`; if not found, probe `bamboohr --version`. Either zero-exit signals layer-2 availability. The binary name varies by install method (Homebrew ships one, npm install ships the other), so both names MUST be attempted before falling through.
3. **rest** — `GET https://api.bamboohr.com/api/gateway.php/${BAMBOOHR_COMPANY}/v1/employees/${BAMBOOHR_EMPLOYEE_ID}` with HTTP Basic auth using `${BAMBOOHR_API_KEY}:x` (literal `x` in the password slot per BambooHR's documented auth scheme). HTTP 200 = available.

## Auth

Credentials MUST be read exclusively from environment variables. The active scheme is selected by which probe layer succeeded, per the credential-layering rule in `connector-pattern.md` §Auth.

**MCP layer:** the MCP host runtime carries credentials per its own configuration; no env var is read directly by this connector when `layer = mcp`. Mirrors the precedent set by `tempo.md` §Auth.

**CLI layer:** the `bamboo` / `bamboohr` binary reads its own config file (typically `~/.bamboohr/config` or equivalent); no env var is read by this connector when `layer = cli`.

**REST layer:**
- `BAMBOOHR_API_KEY` — Basic-auth username slot.
- `BAMBOOHR_COMPANY` — subdomain segment substituted into the URL `/{company}/`.
- `BAMBOOHR_EMPLOYEE_ID` — the user's own employee id; the literal value `self` is permitted when the deployment supports `/employees/me`.

Header: HTTP Basic with username `${BAMBOOHR_API_KEY}` and password `x` (literal — this is BambooHR's documented scheme, NOT an empty string). All printed values MUST be masked per `connector-pattern.md` §Auth (key pattern match, first-2…last-2 characters).

## Capabilities

- `read: true`
- `write: false` (write is OUT OF SCOPE for v1; the connector MUST NOT issue mutating requests against BambooHR)
- Operations:
  - `time_off_requests(from, to, employee_id=self)` — returns the canonical envelope (see Output shape) with `data.requests` carrying the `TimeOff[]` array.
- `entities`: `time-off`.
- `pagination`: per `connector-pattern.md` §Capabilities. BambooHR REST returns the full window in one response for the listed endpoint; if a future implementation surfaces a paginated form, the canonical pattern MUST be followed.
- `rate-limit policy`: per `connector-pattern.md` §Capabilities. BambooHR documentation states a soft limit near 1k requests/min/IP; the default exponential backoff (1 s / 2 s / 4 s × 3 attempts) is sufficient — no connector-specific override.

## Native endpoint mapping

REST layer only. The endpoint resolves as:

`GET ${BAMBOOHR_BASE_URL}/time_off/requests?start={from}&end={to}&employeeId={id}&status=approved`

where `${BAMBOOHR_BASE_URL}` resolves to `https://api.bamboohr.com/api/gateway.php/${BAMBOOHR_COMPANY}/v1`.

The native response is BambooHR's JSON list of time-off requests with shape `{ id, employeeId, name, status, start, end, type: { name }, notes }`; the connector normalizes each entry to a `TimeOff` per Output shape below.

`status=approved` is hard-coded in v1 — the connector MUST NOT surface `pending` or `denied` requests. Rationale: `log-vacation` consumes only confirmed leave; pending or denied entries would corrupt downstream calendars and the local vacation store.

## Output shape

Every response MUST be wrapped in the normalized envelope from `connector-pattern.md` §Output shape. `connector` is always `"bamboohr"`. `kind` is always `"time-off-batch"` (matching the batch-naming convention from `git.md`, `holidays.md`, and `jira-activity.md`). `source` ∈ `{ "mcp", "cli", "rest" }` per the probe layer that produced the result — this connector does NOT deviate from the canonical `source` enum.

`data` carries `{ from, to, employee_id, requests, warnings }`. `data.warnings` MUST be present (possibly empty) on every response, mirroring the `git.md` / `location.md` / `holidays.md` precedent.

```json
{
  "kind": "time-off-batch",
  "source": "rest",
  "connector": "bamboohr",
  "timestamp": "<ISO-8601 UTC>",
  "data": {
    "from": "<YYYY-MM-DD>",
    "to": "<YYYY-MM-DD>",
    "employee_id": "<id-or-self>",
    "requests": [ /* TimeOff[] */ ],
    "warnings": []
  }
}
```

### `TimeOff` schema

```json
{
  "id": "<bamboo request id>",
  "from": "<YYYY-MM-DD>",
  "to": "<YYYY-MM-DD>",
  "reason": "vacation | sick | personal | other",
  "status": "approved | pending | denied",
  "note": "<plain string or null>",
  "source": "bamboo",
  "external_ref": { "bamboo_id": "<id>" }
}
```

`TimeOff.source` is the per-record provenance tag (always `"bamboo"`); `envelope.source` is the transport-layer name (`mcp | cli | rest`). The two fields are NOT interchangeable — disambiguate explicitly per the precedent set in `git.md` and `jira-activity.md` (the `WorkEvent.kind` vs `envelope.kind` paragraph).

### Reason mapping

BambooHR `type.name` → normalized `TimeOff.reason`:

| BambooHR `type.name` | normalized `reason` |
|---|---|
| `Vacation` | `vacation` |
| `PTO` | `vacation` |
| `Paid Time Off` | `vacation` |
| `Sick` | `sick` |
| `Sick Leave` | `sick` |
| `Personal` | `personal` |
| `Personal Day` | `personal` |
| any other value | `other` |

Match comparison: case-insensitive, exact string equality after trimming whitespace. Any value not in the table maps to `other`.

## Error taxonomy

Inherits from `connector-pattern.md` §Error taxonomy. Connector-specific notes:

- `auth` MUST stop probing immediately and escalate to the caller. The connector MUST NOT silently fall through to a less-authenticated layer (e.g., from CLI to REST with bad creds) — this would mask a misconfigured BambooHR token.
- `network` MUST stop probing immediately too. This connector does NOT replicate the `holidays.md` soft-fall-through deviation; HR data is identity-bound and partial-availability is dangerous.
- `unsupported` is surfaced when no layer is available.
- `401` → `auth`; `403` → `auth` (BambooHR returns 403 for missing scopes); `404` on the employee endpoint → `unsupported` with hint `"BambooHR employee_id not found"`.

## Fallback rules

Inherits from `connector-pattern.md` §Fallback rules without modification. Standard layer-N → layer-(N+1) transition on `unsupported`; immediate escalation on `auth` and `network`. Every layer transition MUST be recorded.

## Forbidden behaviors

In addition to `connector-pattern.md` §Forbidden behaviors, this connector:

- MUST NOT mutate any HR state. No `POST`, `PUT`, `DELETE`, or `PATCH` against BambooHR endpoints in v1.
- MUST NOT request statuses other than `approved` from the time-off endpoint. `status=approved` is hard-coded.
- MUST NOT cache responses across runs. BambooHR state is live (a request can be revoked or amended after approval); per-run in-memory caching only.
- MUST NOT log raw `BAMBOOHR_API_KEY` values. Apply credential masking from `connector-pattern.md` §Auth.

## Idempotency

Per `idempotency.md`. Responses are cached per-run only (in-memory) and MUST NOT be persisted across runs. Rationale: BambooHR time-off state is mutable from the HR side — a request can be revoked or amended after approval — so cross-run caching would surface stale data.

`envelope.timestamp` MUST be derived from the single UTC instant captured at skill start per the `Single now` rule from `idempotency.md`; it MUST NOT be re-sampled per call within a run.

**Determinism caveat.** Re-running `time_off_requests(from, to, employee_id)` MAY return different results across runs because HR state is not monotonic — approved requests can be revoked, amended, or deleted by HR after the fact. This is an inherent property of the upstream data, not a connector bug; downstream consumers MUST treat each call as a fresh snapshot rather than a stable view.
