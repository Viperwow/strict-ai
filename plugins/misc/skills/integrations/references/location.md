# location connector reference

This connector is the local-only `aux` reference for detecting the user's country and IANA timezone from system signals. It bundles `tz-country.json` (sibling file at `plugins/misc/skills/integrations/references/tz-country.json`, a subset of tzdata `zone.tab`) for offline IANA-zone → ISO-3166-1 alpha-2 country lookup, so detection works without a network round-trip. It is consumed by `holidays`, `vacation-store`, and `log-work` to localize date logic (workweek shape, holiday calendar, vacation defaults).

## Class

Class: `aux`. Per `connector-pattern.md` §Class, aux connectors provide supporting non-event data and MAY be called freely as long as they remain read-only. This connector reads system locale, region, and timezone settings only — it performs no network request and no remote interaction of any kind.

## Probe order

This connector has FOUR probe layers, attempted in declared order; stop at first success. Apply the stopping rules from `connector-pattern.md` §Probe order. Note that the layer ordering reflects detection-method preference, not transport tiers — the layer that produced the result MUST be recorded as the `method` field on every `detect_country` response.

1. **os-region** — query the operating-system region setting.
   - Windows: PowerShell `[System.Globalization.RegionInfo]::CurrentRegion.TwoLetterISORegionName`.
   - macOS: `defaults read -g AppleLocale` → split on `_` → take right-hand side.
   - Linux: `localectl status` → read `LANG=<xx_YY.UTF-8>` → extract `YY`.
2. **locale-env** — read `$LC_ALL`; if empty, read `$LANG`. Parse the value as `xx_YY...` and take `YY`.
3. **tz-country** — resolve the system IANA zone (see `detect_timezone` below) and look it up in the bundled `tz-country.json`. If the zone is NOT present in the table, this layer MUST fall through to layer 4 with a warning surfaced under `data.warnings: [...]`. A zone-table miss is NOT an error.
4. **user** — interactive prompt: `Country (ISO-3166-1 alpha-2, e.g. RU, US, DE)?`. The prompt is the safety net and MUST NOT fire until layers 1–3 have all been attempted.

Silent downgrade is forbidden per `connector-pattern.md` §Probe order: every layer transition MUST be recorded by setting `envelope.source` (and `data.method`, on `detect_country` only) to the layer that ultimately produced the result. `detect_timezone` has no `data.method` field — see Output shape below.

## Auth

N/A. This connector reads no environment variables for authentication and contacts no remote system. Credential masking rules from `connector-pattern.md` §Auth do not apply.

## Capabilities

- `read: true`
- `write: false`
- Operations:
  - `detect_country()` — returns the canonical envelope (see Output shape) with `data` carrying `{ country, method, detected_at }`.
  - `detect_timezone()` — returns the canonical envelope with `data` carrying `{ timezone }`. Source resolution order: `Intl.DateTimeFormat().resolvedOptions().timeZone` (Node) → `date +%Z` (POSIX) → `readlink /etc/localtime` (Linux fallback). The first source that yields a non-empty IANA zone string wins.
- `entities`: `location`.
- `pagination`: N/A (single-shot lookups; no list endpoints).
- `rate-limit policy`: N/A (entirely local; no quota applies).

## Output shape

Each call returns ONE canonical envelope per `connector-pattern.md` §Output shape. `connector` is always `"location"`; `kind` is always `"location"`.

**Deviation from §Output shape (`source` field).** The canonical `source` enum is `mcp | cli | rest` — the transport tier that produced the call. This connector has no transport tiers (it executes shell-outs and process API calls directly), so `source` repurposes to name the detection layer that produced the result: `source` ∈ `{ "os-region", "locale-env", "tz-country", "user" }`. This is the only known divergence from the canonical enum and is documented here so consumers do not treat it as drift. On every `detect_country` response, `envelope.source` and `data.method` MUST agree (both name the same layer).

### `detect_country` envelope

```json
{
  "kind": "location",
  "source": "os-region",
  "connector": "location",
  "timestamp": "<ISO-8601 UTC>",
  "data": {
    "country": "RU",
    "method": "os-region",
    "detected_at": "<ISO-8601 UTC>",
    "warnings": []
  }
}
```

`data.country` is an ISO-3166-1 alpha-2 code (uppercase). `data.method` is the layer that produced the country (matches `envelope.source`). `data.detected_at` is the UTC instant the detection ran (subject to the `Single now` rule from `idempotency.md`). `data.warnings` MUST be present (possibly empty) on every response; one string entry per zone-table miss recorded during layer 3 fall-through.

### `detect_timezone` envelope

```json
{
  "kind": "location",
  "source": "tz-country",
  "connector": "location",
  "timestamp": "<ISO-8601 UTC>",
  "data": {
    "timezone": "Europe/Moscow"
  }
}
```

`data.timezone` is an IANA zone string (e.g. `Europe/Moscow`, `America/New_York`). On a `detect_timezone` response, `envelope.source` MUST be `"os-region"` — the JS / POSIX / readlink resolution chain described under Capabilities is treated as a single OS-region probe and reports that layer name. The other three layer values (`locale-env`, `tz-country`, `user`) do NOT apply to `detect_timezone` because none of them produces a zone string: `locale-env` parses a country code, `tz-country` consumes a zone (rather than producing one), and the user prompt asks for a country. If every step of the resolution chain fails, the connector surfaces `unsupported`.

`envelope.kind` is always `"location"` for this connector and is the entity-type discriminator from `Capabilities.entities`. There is no inner `kind` field on `data`, so the `WorkEvent.kind` vs `envelope.kind` disambiguation that applies to source connectors does not apply here.

## Error taxonomy

Inherits from `connector-pattern.md` §Error taxonomy. Connector-specific notes:

- `auth` — N/A. No auth is used.
- `network` — N/A. The connector is entirely local.
- `unsupported` — surfaced ONLY when all four probe layers fail. The layer-4 user prompt is the safety net; in practice it always succeeds, so `unsupported` is unreachable under normal conditions.
- A layer-3 (`tz-country`) lookup miss is NOT an error. The connector MUST fall through to layer 4 transparently and append a string to `data.warnings: [...]` so the caller MAY display it. Empty `data.warnings` is the common case.

## Fallback rules

Inherits from `connector-pattern.md` §Fallback rules. The four layers fall through left-to-right per the standard `unsupported` rule: a layer that cannot produce a result MUST escalate to the next layer, recording the transition. Because `auth` and `network` are not applicable here, the immediate-bubble-up paths from §Fallback rules are unreachable.

## Forbidden behaviors

In addition to `connector-pattern.md` §Forbidden behaviors, this connector:

- MUST NOT modify system locale, time zone, or any environment variable.
- MUST NOT perform any network request (DNS lookups, HTTP, IP-geolocation services, WHOIS, etc.).
- MUST NOT cache to disk. In-memory caching is the caller's responsibility — see Idempotency.
- MUST NOT prompt the user without first exhausting layers 1–3.

## Idempotency

Per `idempotency.md`. The caller caches results in memory under the keys `jira:log-time:country` (the country code) and `jira:log-time:country-detected-by` (the layer name that produced the country). Cache invalidation rule: re-probe after 30 days OR on the `--redetect` flag from the consumer skill.

The `data.detected_at` timestamp and the outer `envelope.timestamp` MUST be derived from the same UTC instant per the `Single now` rule from `idempotency.md` — capture once at probe start, reuse for both fields. Repeated `detect_country()` calls within the same skill run MUST return the cached envelope rather than re-probing; without this, the timestamp would drift between calls and break determinism downstream.

System region, locale, and timezone are observational signals: they MAY change between skill runs (the user travels, the system reboots into a new region). The connector reports the current value on each non-cached call; the 30-day TTL bounds staleness without imposing per-run cost.
