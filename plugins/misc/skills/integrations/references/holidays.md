# holidays connector reference

This connector is the public-holiday `aux` reference for resolving non-working calendar dates from a free public API with a disk-cache fallback. It consumes `country` (ISO-3166-1 alpha-2) from the `location` connector. It is consumed by `log-work` (catch-up time-logging skips holidays) and `log-vacation` (workweek date logic excludes holidays from billable spans).

## Class

Class: `aux`. Per `connector-pattern.md` §Class, aux connectors provide supporting non-event data and MAY be called freely as long as they remain read-only. This connector reads remote holiday data via a public free API and caches results to disk for reuse; it performs no remote mutation and has no `write` capability.

## Probe order

This connector has TWO probe layers, attempted in declared order; stop at first success.

1. **rest** — `GET https://date.nager.at/api/v3/publicholidays/{year}/{country}`. No auth required. HTTP 200 = available. The native response is a JSON array of `{ date, localName, name, countryCode, fixed, global, counties, launchYear, types }`.
2. **cache** — read the disk cache at `${CLAUDE_PLUGIN_DATA}/holidays-{country}-{year}.json`, which stores the raw layer-1 response (or a hand-edited offline equivalent). If neither layer is available, return an empty `holidays` array with one warning surfaced under `data.warnings: [...]`.

**Deviation from `connector-pattern.md` §Probe order.** The standard stopping rule mandates that an `auth` or `network` error MUST escalate to the caller immediately; this connector deviates by treating `network` as a fall-through trigger from layer 1 to layer 2 (cache-only). Rationale: holiday data is non-critical metadata; the consumer skill treats "no holidays known" as "proceed without holiday filtering" — failing closed would be worse UX than failing soft. `auth` does not apply (the API is public).

## Auth

N/A. The endpoint is public; no auth headers are read or sent. The connector reads no user-provided environment variables. The `${CLAUDE_PLUGIN_DATA}` path used for caching (see Idempotency) is a runtime-injected directory provided by the Claude Code plugin host, not a user-set credential — credential masking rules from `connector-pattern.md` §Auth do not apply.

## Capabilities

- `read: true`
- `write: false` (caller-side cache writes are described under Idempotency, not as a connector capability)
- Operations:
  - `holidays_for(year, country)` — returns the canonical envelope (see Output shape) with `data` carrying `{ year, country, holidays, warnings }`. `data.holidays` is the `Holiday[]` array.
- `entities`: `holiday`.
- `pagination`: N/A (a `(year, country)` request always returns the full set in one response).
- `rate-limit policy`: per `connector-pattern.md` §Capabilities. date.nager.at publishes no rate limit; the default exponential backoff applies.

## Output shape

Each call returns ONE canonical envelope per `connector-pattern.md` §Output shape. `connector` is always `"holidays"`. `kind` is always `"holiday-batch"` (the singular `"holiday"` is unused since this connector only returns batches; this matches the precedent set by `git.md` and `jira-activity.md` for batch-shaped responses).

**Deviation from §Output shape (`source` field).** The canonical `source` enum is `mcp | cli | rest`. This connector has no MCP or CLI layer and adds a disk-cache layer that is not a transport tier, so `source` ∈ `{ "rest", "cache" }`. `cache` names the layer-2 disk-fallback path. This is the only divergence from the canonical enum and is documented here so consumers do not treat it as drift. On the both-layers-fail terminal path (see Error taxonomy), `envelope.source` carries the layer that LAST attempted (i.e. `"cache"`), even though that layer also failed.

```json
{
  "kind": "holiday-batch",
  "source": "rest",
  "connector": "holidays",
  "timestamp": "<ISO-8601 UTC>",
  "data": {
    "year": 2026,
    "country": "RU",
    "holidays": [
      { "date": "<YYYY-MM-DD>", "name": "<localized name>", "country": "<XX>", "type": "public" }
    ],
    "warnings": []
  }
}
```

`data.warnings` MUST be present (possibly empty) on every response; one string entry per layer-failure transition recorded during probing.

### `Holiday` schema

- `date` — ISO-8601 calendar date `YYYY-MM-DD`.
- `name` — human-readable holiday name. Use `localName` from date.nager.at where available; fall back to the `name` field.
- `country` — ISO-3166-1 alpha-2 code mirroring the request argument.
- `type` — one of `"public" | "bank" | "school" | "observance"`, derived from date.nager.at's multi-valued `types` array. Mapping rule, applied in order: if `types` contains `"Public"` emit `"public"`; else if `"Bank"` emit `"bank"`; else if `"School"` emit `"school"`; else emit `"observance"`.

Only `type=public` is consumed by `log-work` for catch-up filtering and by `log-vacation` for workweek date logic; the other three types are surfaced for completeness.

`envelope.kind` (always `"holiday-batch"`) is the entity-batch discriminator from `Capabilities.entities`. `Holiday.type` (per-record) is a separate discriminator naming the kind of holiday and is distinct from `envelope.kind` — model after the `WorkEvent.kind` vs `envelope.kind` disambiguation in `git.md` and `jira-activity.md`.

## Error taxonomy

Inherits from `connector-pattern.md` §Error taxonomy. Connector-specific notes:

- `network` does NOT escalate immediately; it triggers the layer-1 → layer-2 fall-through (the deviation flagged under Probe order).
- `auth` — N/A. The API is public.
- If both layers fail (no network AND cache miss), the connector MUST return `{ holidays: [], warnings: ["holidays unavailable for <country>-<year>"] }` with no error code surfaced. The downstream consumer treats empty-with-warning as "no holidays known, proceed".
- `unsupported` is reserved for the case where no probe layer is available at all (e.g., a sandbox blocks all network AND `${CLAUDE_PLUGIN_DATA}` is unwritable for cache).
- `404` from layer 1 means the requested `country` is not in date.nager.at's coverage set. Map to `unsupported` and fall through to layer 2; if layer 2 also misses, terminate with the empty-array + `holidays unavailable for <country>-<year>` warning. A 4xx OTHER than 404 from layer 1 is `client` per the canonical taxonomy and MUST be surfaced — it MUST NOT be silently mapped to the empty-with-warning terminal state.

## Fallback rules

Inherits from `connector-pattern.md` §Fallback rules with the network deviation noted under Error taxonomy. The layer-1 → layer-2 transition triggers on `network`; the transition MUST be recorded by setting `envelope.source` to `"cache"`. If layer 2 also fails, the connector MUST fail soft to an empty `holidays` array plus a `data.warnings` entry — this is the terminal behavior, NOT an error escalation.

## Forbidden behaviors

In addition to `connector-pattern.md` §Forbidden behaviors, this connector:

- MUST NOT mutate any remote state. The date.nager.at API is read-only by design; the connector MUST NOT use HTTP methods other than `GET`.
- MUST NOT cache responses outside the year-keyed file path defined under Idempotency. Indefinite or unkeyed caching is forbidden.
- MUST NOT swallow non-network errors silently. A 4xx other than 404 is `client` per the canonical taxonomy and MUST be surfaced; it MUST NOT collapse into the empty-with-warning terminal state.
- MUST NOT accept `country` codes that are not ISO-3166-1 alpha-2 — the caller is responsible for validating before calling.

## Idempotency

Per `idempotency.md`. The cache file `${CLAUDE_PLUGIN_DATA}/holidays-{country}-{year}.json` is the source of truth and stores the raw layer-1 response (or a hand-edited offline equivalent). Cache durability rules:

- **Past years** — cache never invalidates. Public holidays are retrospective once the calendar year has closed.
- **Current year** — cache MAY be invalidated on the `--refresh-holidays` flag passed to the consumer skill (`log-work` or `log-vacation`); otherwise, the cache is reused for the entire calendar year. The flag is connector-scoped, so either consumer triggers the same refresh.
- **Future years** — cache is rebuilt on year-roll. "Year-roll" is defined as the first connector call where `year > <year embedded in the cache file name>` AND the current UTC instant (per the `Single now` rule from `idempotency.md`) has crossed `<embedded year>-12-31T23:59:59Z`. The connector MUST NOT return stale data from a future-year cache that predates a known regulatory change; on year-roll, the layer-1 fetch is mandatory before reuse.

Cache writes follow the `Atomic writes` rule from `idempotency.md`: write `holidays-{country}-{year}.json.tmp`, fsync, rename over the target. The `envelope.timestamp` MUST be derived from the single UTC instant captured at probe start per the `Single now` rule from `idempotency.md`. This connector emits `timestamp` only — there is no `data.detected_at`-equivalent field.
