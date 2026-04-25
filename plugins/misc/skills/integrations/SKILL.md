---
name: integrations
description: Passive documentation bundle of connector references for external systems (Jira, Tempo, BambooHR, git, holidays, location, local JSON stores). Not user-invokable. Consumed by other skills that declare a connector dependency and point Claude at the relevant reference file under this skill's references/ directory.
disable-model-invocation: true
---

# integrations

This skill is a library of **connector references**. Each file under `references/` documents how to talk to one external system, normalized against the contract in `references/connector-pattern.md`. Consumers (other skills) do not invoke this skill directly; they reference specific files under `references/` by absolute plugin-relative path.

## How to consume

1. Read `references/connector-pattern.md` once to understand the contract every other reference here satisfies.
2. Read `references/idempotency.md` for shared determinism rules (timestamps, atomic writes, sort keys).
3. For each external operation your skill needs, read the matching connector reference below and follow its probe chain / auth / output-shape / error rules strictly.

## Connector index

| Connector | Class  | File                                   | Summary |
| :-------- | :----- | :------------------------------------- | :------ |
| jira              | aux    | `references/jira.md`            | Jira core — search, issue CRUD, worklog read, sprint / board queries. MCP → acli → REST v3 Cloud → REST v2 on-prem. |
| jira-activity     | source | `references/jira-activity.md`   | Per-day issue events: status changes, comments, assignments. Thin wrapper over `jira` + JQL/changelog. |
| jira-worklog      | sink   | `references/jira-worklog.md`    | Worklog write via Jira native API. Fallback sink when Tempo is unavailable. |
| tempo             | sink   | `references/tempo.md`           | Tempo worklog write (primary sink). Falls through to `jira-worklog` on probe miss / unsupported. |
| git               | source | `references/git.md`             | Local-git commits per day (author.email match, multi-repo). Extracts issue keys by regex `[A-Z][A-Z0-9]+-\d+`. |
| location          | aux    | `references/location.md`        | Country / timezone detection (OS region → locale env → tz→country via `tz-country.json` → prompt). |
| holidays          | aux    | `references/holidays.md`        | Public holidays per country-year, cached under `${CLAUDE_PLUGIN_DATA}/holidays-{country}-{year}.json`. |
| bamboohr          | aux    | `references/bamboohr.md`        | BambooHR time-off read. Probe MCP → CLI → REST. |
| vacation-store    | aux    | `references/vacation-store.md`  | Local JSON CRUD for user-entered vacation periods. |

## Shared references

- `references/connector-pattern.md` — base contract every connector satisfies.
- `references/idempotency.md` — determinism rules (single `now`, atomic writes, stable sort, no-random).
- `references/tz-country.json` — bundled timezone → ISO-3166-1 alpha-2 table, extracted subset of tzdata `zone.tab`.

## Adding a new connector

1. Duplicate the structure from an existing reference file of the same class (source / sink / aux).
2. Fill every section listed in `connector-pattern.md`.
3. Add a row to the connector index above.
4. Consumer skills add the reference path to their `Connectors:` section and point Claude at the file at runtime.
