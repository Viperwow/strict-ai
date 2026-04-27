# config-schema — `log-work.json`

Reference for the local configuration file consumed by the `log-work` skill. The skill reads this file during Phase 0 and writes it atomically on first successful run if absent.

## File location

`${CLAUDE_PLUGIN_DATA}/log-work.json`. `${CLAUDE_PLUGIN_DATA}` is a runtime-injected directory provided by the Claude Code plugin host, not a user-set credential — same wording as `vacation-store.md` §Auth.

## Top-level schema

```json
{
  "target_hours": 8,
  "step_minutes": 30,
  "workdays": ["mon","tue","wed","thu","fri"],
  "sources": { "enabled": ["git","jira-activity"] },
  "sinks":   { "primary": "tempo", "fallback": "jira-worklog" },
  "location_connector": "location",
  "holidays_connector": "holidays",
  "vacation_connectors": ["bamboohr","vacation-store"],
  "auto_task_label": "auto-logged",
  "auto_task_type": "Story",
  "lookback_default_days": 7,
  "day_start_local": "09:00",
  "git_repos": [],
  "event_weights": {
    "commit": 1.0,
    "comment": 1.0,
    "status-change": 3.0,
    "assignment": 2.0,
    "field-edit": 2.0
  },
  "deviation_warning_pct": 5
}
```

## Field reference

| Field | Type | Constraints | Default | Effect on pipeline |
|-------|------|-------------|---------|-------------------|
| `target_hours` | number | positive, ≤ 24 | `8` | Daily worklog target in hours. The Phase 2 distribution MUST sum to this value. Overridden per-run by the `target` CLI arg. |
| `step_minutes` | integer | ∈ {15, 30, 60} | `30` | Distribution rounding granularity in minutes. Each proposed bucket is rounded to the nearest multiple of this value. Overridden per-run by the `step` CLI arg. |
| `workdays` | array of strings | each ∈ {"mon","tue","wed","thu","fri","sat","sun"}, at least 1 element, no duplicates | `["mon","tue","wed","thu","fri"]` | Days treated as working days. Phase 1 removes all dates not in this set before scanning for missing worklogs. |
| `sources.enabled` | array of strings | each ∈ {"git","jira-activity"}, at least 1 element | `["git","jira-activity"]` | Source connectors activated in Phase 2. Connectors are probed in list order. Overridden per-run by the `sources` CLI arg. |
| `sinks.primary` | string | ∈ {"tempo","jira-worklog"} | `"tempo"` | Primary write sink. Worklog writes are sent here first. Falls through to `sinks.fallback` only on `unsupported`; MUST NOT fall through on `auth` or `network`. |
| `sinks.fallback` | string or null | ∈ {"tempo","jira-worklog"} or null; MUST differ from `sinks.primary` when non-null | `"jira-worklog"` | Fallback sink activated when the primary returns `unsupported` at every probe layer. Set to `null` to disable fallback entirely. |
| `location_connector` | string | — | `"location"` | Connector name used for ISO-3166-1 alpha-2 country and IANA timezone detection in Phase 0. Result cached in memory under `jira:log-time:country`. |
| `holidays_connector` | string | — | `"holidays"` | Connector name used for public-holiday lookup (type=public only) in Phase 1. Results disk-cached at `${CLAUDE_PLUGIN_DATA}/holidays-{country}-{year}.json`. |
| `vacation_connectors` | array of strings | each ∈ {"bamboohr","vacation-store"} | `["bamboohr","vacation-store"]` | Vacation read sources probed in list order during Phase 1. `vacation-store` is always required; if it returns `unsupported`, execution stops. `bamboohr` `unsupported` degrades gracefully. |
| `auto_task_label` | string | — | `"auto-logged"` | Label applied to every Jira issue auto-created in the ad-hoc task creation flow. Per the Auto-created artifacts are labeled rule from `idempotency.md`, future probes MUST search for this label before creating a new issue. |
| `auto_task_type` | string | — | `"Story"` | Jira issue type for auto-created issues. Validated against the project's create-screen metadata from the jira connector before the issue is created. |
| `lookback_default_days` | integer | ≥ 1, ≤ 365 | `7` | Default lookback window in days when the `lookback` CLI arg is absent. Phase 1 scans `[date - lookback_default_days, date]` inclusive. |
| `day_start_local` | string | format "HH:MM" (24-hour) | `"09:00"` | Local time used as the worklog timestamp anchor when writing to Tempo. The Tempo connector converts this to UTC using the resolved IANA timezone. |
| `git_repos` | array of strings | absolute filesystem paths | `[]` | Additional repositories scanned by the git connector beyond the current working directory. An empty array means only the cwd repo is scanned. |
| `event_weights.commit` | number | ≥ 0 | `1.0` | Weight applied to git commit events when computing normalized `raw_weight` per bucket in Phase 2. |
| `event_weights.comment` | number | ≥ 0 | `1.0` | Weight applied to Jira comment events. |
| `event_weights.status-change` | number | ≥ 0 | `3.0` | Weight applied to Jira status-change events. Higher default reflects that a status change is a stronger signal of active engagement. |
| `event_weights.assignment` | number | ≥ 0 | `2.0` | Weight applied to Jira assignment events. |
| `event_weights.field-edit` | number | ≥ 0 | `2.0` | Weight applied to Jira field-edit events. |
| `deviation_warning_pct` | number | ≥ 0, ≤ 100 | `5` | Percentage deviation from `target_hours` that triggers the `Total Nh != target Th. (a)ccept / (r)edistribute / (e)dit` prompt in Phase 2. |

## Precedence

Highest to lowest:

1. **CLI argument** — overrides everything for the current run only.
2. **Environment variable** — none defined in v1.
3. **Memory key** — values stored in Claude memory: `jira:last-project` (project key), `jira:log-time:country` (country code).
4. **Config file** — `${CLAUDE_PLUGIN_DATA}/log-work.json`.
5. **Built-in default** — values baked into the skill (e.g. `target_hours=8`, `lookback_default_days=7`, `step_minutes=30`).

No environment variables are defined for this config in v1.

## Write behavior

The config file is written once, on first successful run, using the Atomic writes rule from `idempotency.md`: write to `log-work.json.tmp`, fsync, then rename over the target. This prevents partial writes from leaving the file corrupt.

Subsequent runs are **read-only**. The skill MUST NOT rewrite the config on subsequent runs unless the file is absent. To change a default (e.g. `target_hours`, `workdays`, `git_repos`), the user edits `log-work.json` manually.

## Migration policy

`version` is implicit `1` in v1 — it is not stored in the file. Future version bumps follow the store-schema pattern: the skill auto-backs up the pre-migration file to `log-work.v{old}.json.bak` before applying the in-place migration. Any migration MUST be idempotent: running it twice on the same file MUST produce the same result.

**v1 (current):** No migration needed. The file is valid as-is.

Future version bumps MUST add a migration step to this section describing the transformation applied and the fields added, removed, or renamed.

## Example config

A realistic populated config showing a 6-hour day, a Saturday workday, a custom repo path, and non-default event weights. All other fields are at their defaults.

```json
{
  "target_hours": 6,
  "step_minutes": 30,
  "workdays": ["mon","tue","wed","thu","fri","sat"],
  "sources": { "enabled": ["git","jira-activity"] },
  "sinks":   { "primary": "tempo", "fallback": "jira-worklog" },
  "location_connector": "location",
  "holidays_connector": "holidays",
  "vacation_connectors": ["bamboohr","vacation-store"],
  "auto_task_label": "auto-logged",
  "auto_task_type": "Story",
  "lookback_default_days": 7,
  "day_start_local": "09:00",
  "git_repos": ["/home/user/projects/backend-api"],
  "event_weights": {
    "commit": 1.5,
    "comment": 0.5,
    "status-change": 4.0,
    "assignment": 2.0,
    "field-edit": 1.0
  },
  "deviation_warning_pct": 5
}
```

Notes on this example:

- `target_hours: 6` — a 6-hour working day instead of the default 8.
- `workdays` includes `"sat"` — Saturday is treated as a working day for this user.
- `git_repos` adds one absolute path; the git connector scans both that repo and the cwd repo.
- `event_weights.commit` raised to `1.5` and `event_weights.status-change` to `4.0` — commit and status-change events carry more weight in the distribution.
- `event_weights.comment` lowered to `0.5` — comments are treated as a weaker signal.
