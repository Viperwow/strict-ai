# Jira Time-Logging Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver two new Jira-plugin skills (`log-work`, `log-vacation`) backed by a reusable connector-reference library in the `misc` plugin, so the user can interactively log 8h/day to the right Jira issues with Tempo (primary) / native worklog (fallback), catch up missed days over a 7-day (configurable) lookback window, and manage vacation entries that gate the catch-up.

**Architecture:** All external I/O (Jira, Tempo, BambooHR, git, holidays, OS locale) is abstracted behind uniform **connector** references living in `plugins/misc/skills/integrations/references/`. Each connector satisfies the contract in `connector-pattern.md` (probe order, auth, capabilities, normalized output shape, error taxonomy, fallback). Jira-plugin skills depend on the contract, never on a specific implementation, so adding a new source/sink is one new reference file. `integrations` is a meta-skill with `disable-model-invocation: true` — it is a passive documentation bundle consumed by other skills.

**Tech Stack:** Claude Code plugin system, Markdown skills (`SKILL.md` + `references/`), YAML frontmatter, JSON for runtime config/state under `${CLAUDE_PLUGIN_DATA}`, existing `check-status` skill as style precedent.

**Source spec:** `docs/superpowers/specs/2026-04-25-jira-time-logging-design.md` — authoritative; consult for any ambiguity.

---

## File Structure

### Plugin files (committed to repo)

```
plugins/
  jira/
    .claude-plugin/plugin.json                          # modified (keywords, version)
    skills/
      check-status/SKILL.md                             # modified (refactor: replace inline connector+idempotency sections with refs)
      log-work/
        SKILL.md                                        # NEW
        references/
          pipeline.md                                   # NEW
          config-schema.md                              # NEW
      log-vacation/
        SKILL.md                                        # NEW
        references/
          store-schema.md                               # NEW
  misc/
    .claude-plugin/plugin.json                          # modified (keywords, version)
    skills/
      integrations/
        SKILL.md                                        # NEW (disable-model-invocation: true)
        references/
          connector-pattern.md                          # NEW
          idempotency.md                                # NEW
          jira.md                                       # NEW
          jira-activity.md                              # NEW
          jira-worklog.md                               # NEW
          tempo.md                                      # NEW
          git.md                                        # NEW
          location.md                                   # NEW
          holidays.md                                   # NEW
          bamboohr.md                                   # NEW
          vacation-store.md                             # NEW
          tz-country.json                               # NEW (bundled data)
```

### Runtime state (not committed; skill writes to `${CLAUDE_PLUGIN_DATA}/`)

```
${CLAUDE_PLUGIN_DATA}/
  log-work.json               # log-work runtime config — target_hours, workdays, sources enabled, sinks priority, etc.
  vacations.json              # vacation store (see store-schema.md)
  holidays-{country}-{year}.json  # cached public holidays
  logged-days.json            # quick-skip cache of fully-logged days
  field-ids.json              # already created by check-status; reused
```

---

## Verification conventions

This plan delivers markdown content (skills, references, JSON schemas). "Tests" are structural and behavioral:

- **Structural verification** (after each file write): use Read to display the file; confirm all required sections from `connector-pattern.md` or this plan's task body are present; confirm no TBD/placeholders.
- **Plugin-load verification** (after each skill delta): run `claude --plugin-dir plugins/jira --plugin-dir plugins/misc` interactively (user will do this) and confirm the skill appears under `/plugin` or `/help` with the namespaced name and the description renders.
- **Behavior verification** (after Phase B, C, D milestones): run the skill against a live Jira dev instance in a throwaway project. Check listed behaviors (listed per-phase below) line up with the spec. The user runs these manually; this plan lists the checks, not the fixtures.

No automated test harness is built — the product is documentation that Claude executes, not code with unit tests.

---

## Task sequence

### Task 1: Create `integrations` meta-skill shell

**Files:**
- Create: `plugins/misc/skills/integrations/SKILL.md`

- [ ] **Step 1: Create the skill directory and SKILL.md**

Write `plugins/misc/skills/integrations/SKILL.md` with this exact content:

```markdown
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
```

- [ ] **Step 2: Verify file structure**

Read the file back; confirm frontmatter contains `disable-model-invocation: true` and the index table lists 9 connectors plus shared refs. No placeholders.

- [ ] **Step 3: Commit**

```bash
git add plugins/misc/skills/integrations/SKILL.md
git commit -m "feat(misc): add integrations meta-skill shell"
```

---

### Task 2: Write `connector-pattern.md`

**Files:**
- Create: `plugins/misc/skills/integrations/references/connector-pattern.md`

- [ ] **Step 1: Write connector-pattern.md**

Content: the base contract every connector reference must satisfy. Include these top-level sections in this order:

1. **Purpose** — one paragraph: a connector is a normalized description of how to interact with one external system, independent of the underlying protocol (MCP / CLI / REST). Consumers depend on the contract, not the transport.
2. **Required sections** — every connector reference MUST include, in this order:
   1. **Class** — `source` | `sink` | `aux`.
   2. **Probe order** — ordered list of interaction layers (e.g. MCP tool name pattern → CLI binary name + probe command → REST endpoint + version detection). Stop at first success. Never downgrade silently on `auth` or `network` error — escalate or stop.
   3. **Auth** — env var names (never store tokens in memory / plugin data), credential layering (Basic for Cloud, Bearer PAT for DC, etc.), masking rules (any key matching `Authorization|BEARER|TOKEN|PAT|API_KEY` must be masked in every line of printed output; show first 2 chars + `…` + last 2 when unavoidable).
   4. **Capabilities** — `read` / `write` flags, entity list, pagination form, rate-limit policy (exponential backoff honoring `Retry-After`, max 3 attempts at 1s/2s/4s, then stop).
   5. **Output shape** — JSON schema of normalized result objects. MUST be transport-independent (a consumer cannot tell whether data came from MCP, CLI, or REST by looking at it).
   6. **Error taxonomy** — mapping to these canonical codes: `auth` (401/403), `not-found` (404), `rate-limited` (429), `network` (timeout, DNS, connection reset), `unsupported` (endpoint/feature missing at current layer), `server` (5xx), `client` (other 4xx). Each code maps to a short human sentence for surfacing; body is truncated to 200 chars max.
   7. **Fallback rules** — for each error code, what the next layer is (or `stop` if non-recoverable). `auth` and `network` errors MUST bubble up (never silently try the next layer); `unsupported` MAY fall through.
3. **Tool resolution rule** — how consumers detect the active layer at runtime: check `mcp__*<name>*__*` tool availability first, then `<binary> --version`, then REST `HEAD` / `GET serverInfo` probes. Record the resolved layer in the final report under `Source:`.
4. **Normalization principle** — each connector is responsible for converting native responses (issue objects, CSV rows, GraphQL nodes) into the `Output shape` JSON. Consumers must not parse native shapes.
5. **Forbidden behaviors** — MUST NOT: (a) echo tokens, (b) mutate state in a `read`-class connector, (c) write without confirmation from caller, (d) retry indefinitely, (e) swallow errors.

Target length: ~120–180 lines. No placeholders.

- [ ] **Step 2: Verify**

Read back; confirm all 5 top-level sections and all 7 required sub-sections of section 2 are present and populated.

- [ ] **Step 3: Commit**

```bash
git add plugins/misc/skills/integrations/references/connector-pattern.md
git commit -m "feat(misc): add connector-pattern contract"
```

---

### Task 3: Write `idempotency.md`

**Files:**
- Create: `plugins/misc/skills/integrations/references/idempotency.md`

- [ ] **Step 1: Write idempotency.md**

Cover these rules in this order; each is a short sub-section:

1. **Single `now`** — capture one UTC timestamp at skill start; reuse for all age math, `Generated:` lines, filename stamps, cache-bucket selection. Never call `Date.now()` / `time.time()` / `DateTime.UtcNow` more than once per skill run.
2. **Atomic writes** — every state write goes `write-tmp → fsync → rename`. Never `truncate-then-write`.
3. **Stable sort keys** — fully specify every tie-breaker, end with a lexicographic key guaranteed unique (issue key natural sort, uuid, etc.). Sorts MUST be pure — no wall-clock inputs.
4. **Missing-value sentinel** — `—` (em-dash) for every absent cell / field. Never empty string, `null`, `N/A`, `undefined`.
5. **Existing worklogs are source of truth** — consumers never delete or rewrite prior worklogs; they only add the missing delta. Duplicate-detection rule: existing `duration_minutes == proposed` AND `comment == proposed` (byte-equal) on the same issue/day/author → skip (no-op). Any other state → add (resulting in multiple entries, which is correct and auditable).
6. **Auto-created artifacts are labeled** — any Jira issue a skill creates carries a configured label (default `auto-logged`) so future probes find and reuse it rather than creating a duplicate.
7. **No random** — no UUIDs in rendered output unless user-facing; for deterministic IDs (internal grouping) use a stable hash of content. For vacation entries that require UUIDs, generate once at `add` time and persist, never regenerate.
8. **Deterministic `JQL:` line** — any JQL emitted for auditability MUST reproduce the exact runtime-resolved query (placeholders substituted). Copy-paste into Jira advanced search must return the same result set.

Target length: ~80–120 lines.

- [ ] **Step 2: Verify**

Read back; confirm all 8 rules present with concrete prescription (not vague).

- [ ] **Step 3: Commit**

```bash
git add plugins/misc/skills/integrations/references/idempotency.md
git commit -m "feat(misc): add idempotency rules reference"
```

---

### Task 4: Write `jira.md` connector (core)

**Files:**
- Create: `plugins/misc/skills/integrations/references/jira.md`

- [ ] **Step 1: Write jira.md**

Produce a connector reference per `connector-pattern.md`. Content specifics for Jira:

**Class:** `aux`

**Probe order:**
1. **Atlassian MCP** — tool names matching `mcp__*atlassian*__*`. If present, use first.
2. **Atlassian CLI `acli`** — probe `acli --version`. JSON output only (`--json` where supported).
3. **Jira Cloud REST v3** — detect: base URL responds `200` to `GET /rest/api/3/myself` with Basic auth. Pagination via `nextPageToken`. JQL endpoint: `POST /rest/api/3/search/jql`.
4. **Jira Server / Data Center REST v2** — detect: `GET /rest/api/2/serverInfo` returns 200 and body `deploymentType` ∈ {`Server`, `DataCenter`} or schema only has `/rest/api/2/`. Pagination via `startAt` / `maxResults`. Assumes Jira 9.x+.

**Auth:**
- Cloud: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`. Basic header: `base64(email:token)`.
- On-prem: `JIRA_BASE_URL`, `JIRA_PAT`. Bearer header: `Authorization: Bearer $JIRA_PAT`.
- Masking: see `connector-pattern.md` §2.3.

**Capabilities:**
- `read`: issue search (JQL), issue get, changelog get, field metadata get, sprint list (`/rest/agile/1.0/board/{id}/sprint`), priority list, project list, worklog list per issue (`GET /issue/{key}/worklog`).
- `write`: issue create (`POST /issue`), label add/remove (PUT `/issue/{key}`), worklog add (`POST /issue/{key}/worklog`).
- Pagination: Cloud = `nextPageToken`, on-prem = `startAt`/`maxResults`. Default page size: 50.
- Rate-limit: see pattern §2.4. Jira Cloud 429 `Retry-After` is respected.

**Output shape** — normalized JSON. Provide schemas for these entities (each its own sub-section):

- `Issue` — `{ key, summary, status: { name, category }, priority: { name, rank }, issuetype, created, updated, duedate, labels[], parent?: { key, summary }, sprint?: { id, name, state, startDate, endDate }, flagged?: string | null, links[]: { type: { inward, outward }, target: { key, status, created } } }`
- `Worklog` — `{ id, author_email, issue_key, started_at (ISO-8601), duration_minutes, comment }`
- `Sprint` — `{ id, name, state: active|closed|future, startDate, endDate, boardId }`
- `FieldMetadata` — `{ id, name, schema: { type, custom? } }` (used to resolve `customfield_10020` / `customfield_10021` on on-prem by schema).

**Error taxonomy:** per pattern. Add: `404` on `POST /search/jql` vs `POST /search` quirk — some Cloud tenants 404 on legacy path; use `/search/jql` exclusively.

**Fallback rules:**
- `auth` → stop (never try next layer).
- `network` → stop.
- `not-found` of an **endpoint** (not an entity) → try next layer.
- `unsupported` (Cloud-only feature queried on on-prem) → try next layer; if no layer supports, stop with message.
- `rate-limited` → backoff per pattern §2.4 at the same layer; if still failing after retries, stop.

**Tool-resolution caching:** record resolved layer per `JIRA_BASE_URL` in `${CLAUDE_PLUGIN_DATA}/field-ids.json` (already created by `check-status`). Re-probe on `auth` failure or after 24h.

Target length: ~200–300 lines.

- [ ] **Step 2: Verify**

Read back; confirm all 7 required sections are present with concrete values (not "TBD").

- [ ] **Step 3: Commit**

```bash
git add plugins/misc/skills/integrations/references/jira.md
git commit -m "feat(misc): add jira core connector reference"
```

---

### Task 5: Write `jira-activity.md` connector (source)

**Files:**
- Create: `plugins/misc/skills/integrations/references/jira-activity.md`

- [ ] **Step 1: Write jira-activity.md**

**Class:** `source` — produces normalized `WorkEvent` records per-day.

**Probe order:** inherits from `jira.md` — this connector is a thin wrapper; no independent probe. If `jira` is unavailable, `jira-activity` is too.

**Capabilities:**
- `read`-only.
- Operations: `events_for(date, assignee=currentUser)`, `events_for_range(from, to, assignee)`.

**Output shape:** array of `WorkEvent`:

```json
{
  "date": "YYYY-MM-DD",
  "source": "jira-activity",
  "kind": "status-change" | "comment" | "assignment" | "field-edit",
  "issue_key": "PROJ-123",
  "summary": "short human-readable (issue summary + event delta)",
  "raw_weight": 3.0,
  "metadata": { "from": "...", "to": "...", "author": "...", "change_id": "..." }
}
```

**Event derivation:**
- Run JQL: `assignee = <assignee> AND updated >= "<date>" AND updated < "<date+1>" AND project = <project>`.
- For each returned issue, fetch changelog; filter histories where `created` falls in the date window and `author` equals the assignee. Each history entry → one `WorkEvent`:
  - `items[].field == "status"` → `kind=status-change`, `raw_weight=3`.
  - `items[].field` in `{"assignee","priority","sprint"}` → `kind=field-edit`, `raw_weight=2`.
  - comments endpoint `GET /issue/{key}/comment` filtered by `created` in window and author → `kind=comment`, `raw_weight=1`.
- Field-level weights tunable via `log-work` config (see `log-work/references/config-schema.md`), documented as defaults here.

**Error taxonomy & fallback:** same as `jira.md` — this connector has no independent layer.

**Idempotency:** all fields used are monotonic (history entries do not mutate); re-running on the same date produces identical output.

Target length: ~100–150 lines.

- [ ] **Step 2: Verify**

Read back; confirm the JQL template is exact and the weight table is concrete.

- [ ] **Step 3: Commit**

```bash
git add plugins/misc/skills/integrations/references/jira-activity.md
git commit -m "feat(misc): add jira-activity source connector"
```

---

### Task 6: Write `jira-worklog.md` connector (sink fallback)

**Files:**
- Create: `plugins/misc/skills/integrations/references/jira-worklog.md`

- [ ] **Step 1: Write jira-worklog.md**

**Class:** `sink`

**Probe order:** delegates to `jira.md`. No independent probe.

**Capabilities:**
- `write`: `create_worklog(issue_key, started_at, duration_minutes, comment)` → `{ id, … }`.
- `read`: `list_worklogs(issue_key, author_email?, date?)` — used for duplicate detection before write.

**Native endpoint mapping:**
- Cloud: `POST /rest/api/3/issue/{key}/worklog` with body `{ timeSpentSeconds: duration_minutes*60, started: ISO-8601-with-tz, comment: ADF-or-text }`. Cloud requires ADF comment; wrap plain string in `{type:"doc",version:1,content:[{type:"paragraph",content:[{type:"text",text:"..."}]}]}`.
- On-prem (v2): `POST /rest/api/2/issue/{key}/worklog` with `comment` as plain string.

**Output shape:** `Worklog` (see `jira.md`).

**Idempotency:** duplicate detection runs before every write; see `idempotency.md` §5.

**Error taxonomy & fallback:** per pattern. Specific: 403 on worklog endpoint typically means time-tracking is disabled on the project — surface as `auth` with the hint "Time tracking may be disabled for <project>".

**Forbidden:** never deletes or edits existing worklogs.

Target length: ~80–120 lines.

- [ ] **Step 2: Verify & Step 3: Commit**

```bash
git add plugins/misc/skills/integrations/references/jira-worklog.md
git commit -m "feat(misc): add jira-worklog sink connector"
```

---

### Task 7: Write `tempo.md` connector (sink primary)

**Files:**
- Create: `plugins/misc/skills/integrations/references/tempo.md`

- [ ] **Step 1: Write tempo.md**

**Class:** `sink`

**Probe order:**
1. Tempo MCP — tool names matching `mcp__*tempo*__*`.
2. Tempo REST v4 (Cloud) — `GET https://api.tempo.io/4/worklogs?limit=1` with bearer from `TEMPO_API_TOKEN`; 200 = available.
3. Tempo Server REST — `GET {JIRA_BASE_URL}/rest/tempo-timesheets/4/worklogs?limit=1` with PAT; 200 = available.

**Auth:**
- Cloud: `TEMPO_API_TOKEN` (Tempo-issued OAuth token).
- Server: bearer via `JIRA_PAT` (Tempo DC uses Jira auth).

**Capabilities:**
- `write`: `create_worklog(issue_key, started_at, duration_minutes, comment, [billable=true])`.
- `read`: `list_worklogs(issue_key, author_email, date)` for duplicate detection.

**Cloud endpoint:** `POST /4/worklogs` with `{ issueKey, timeSpentSeconds, startDate, startTime, description, authorAccountId }`.
**Server endpoint:** `POST /rest/tempo-timesheets/4/worklogs` with `{ issue: { key }, timeSpentSeconds, dateStarted, comment, worker }`.

**Output shape:** same `Worklog` schema as `jira-worklog.md` (normalized).

**Fallback rule (connector-level, special):**
- `unsupported` at every probe layer → caller MUST fall through to `jira-worklog`. This is the only cross-connector fallthrough in the system and is called out explicitly in `log-work/references/pipeline.md`.
- `auth` / `network` → stop (do NOT silently fall through to jira-worklog; user must fix credentials explicitly).

**Idempotency & forbidden behaviors:** identical to `jira-worklog.md`.

Target length: ~100–140 lines.

- [ ] **Step 2: Verify & Step 3: Commit**

```bash
git add plugins/misc/skills/integrations/references/tempo.md
git commit -m "feat(misc): add tempo sink connector"
```

---

### Task 8: Write `git.md` connector (source)

**Files:**
- Create: `plugins/misc/skills/integrations/references/git.md`

- [ ] **Step 1: Write git.md**

**Class:** `source`

**Probe order:**
1. `git --version` on PATH. 1 layer only; no REST / MCP alternative needed for v1.

**Auth:** N/A — local repos, no auth.

**Capabilities:**
- `read`: `commits_for(date, repos[], author_email)` → `WorkEvent[]` with `kind=commit`.
- `list_repos(root?)` — default: current working directory's git root; optionally a list from config `git_repos`.

**Event derivation:**
- For each repo in `repos`:
  - `git -C <repo> log --author="<author_email>" --since="<date> 00:00" --until="<date+1> 00:00" --pretty=format:"%H%x09%ct%x09%s"` (tab-separated hash, committer-timestamp, subject).
  - Filter by committer-timestamp falling in the local-timezone-translated day window.
  - For each commit, regex subject + body for `[A-Z][A-Z0-9]+-\d+` to extract issue keys (may be multiple; all get credit; default weight split evenly).

**Output shape:**

```json
{
  "date": "YYYY-MM-DD",
  "source": "git",
  "kind": "commit",
  "issue_key": "PROJ-123" | null,
  "summary": "hash-prefix: commit subject (truncated 100)",
  "raw_weight": 1.0,
  "metadata": { "repo": "/abs/path", "hash": "abc1234…", "subject": "...", "keys": ["PROJ-123","PROJ-456"], "branch": "feature/xyz" }
}
```

**Error taxonomy:**
- `not-found` when repo dir doesn't exist or isn't a git repo → warn, skip that repo, continue.
- `network` N/A.
- Never treat a repo with zero commits as error — empty is valid.

**Idempotency:** `git log` with a fixed timestamp window is deterministic (commit timestamps are immutable once created).

Target length: ~90–120 lines.

- [ ] **Step 2: Verify & Step 3: Commit**

```bash
git add plugins/misc/skills/integrations/references/git.md
git commit -m "feat(misc): add git source connector"
```

---

### Task 9: Write `location.md` connector + bundled `tz-country.json`

**Files:**
- Create: `plugins/misc/skills/integrations/references/location.md`
- Create: `plugins/misc/skills/integrations/references/tz-country.json`

- [ ] **Step 1: Write tz-country.json**

Bundled subset of tzdata `zone.tab`. Shape:

```json
{
  "Europe/Moscow": "RU",
  "Europe/Berlin": "DE",
  "Europe/London": "GB",
  "America/New_York": "US",
  "America/Los_Angeles": "US",
  "Asia/Tokyo": "JP",
  "Asia/Shanghai": "CN",
  "Asia/Dubai": "AE",
  "Australia/Sydney": "AU",
  "Europe/Paris": "FR",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/Warsaw": "PL",
  "Europe/Stockholm": "SE",
  "Europe/Helsinki": "FI",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Prague": "CZ",
  "Europe/Vienna": "AT",
  "Europe/Zurich": "CH",
  "Europe/Brussels": "BE",
  "Europe/Lisbon": "PT",
  "Europe/Dublin": "IE",
  "Europe/Athens": "GR",
  "Europe/Istanbul": "TR",
  "Europe/Kyiv": "UA",
  "Europe/Minsk": "BY",
  "Asia/Yerevan": "AM",
  "Asia/Tbilisi": "GE",
  "Asia/Baku": "AZ",
  "Asia/Almaty": "KZ",
  "Asia/Tashkent": "UZ",
  "Asia/Bishkek": "KG",
  "Asia/Seoul": "KR",
  "Asia/Kolkata": "IN",
  "Asia/Singapore": "SG",
  "Asia/Hong_Kong": "HK",
  "America/Toronto": "CA",
  "America/Mexico_City": "MX",
  "America/Sao_Paulo": "BR",
  "America/Buenos_Aires": "AR",
  "Africa/Johannesburg": "ZA",
  "Africa/Cairo": "EG"
}
```

(Engineer: expand as needed; ~40 entries cover 95% of user bases. Ambiguous zones are resolved to the first alphabetical country.)

- [ ] **Step 2: Write location.md**

**Class:** `aux`

**Probe order** (country detection):
1. **OS region**:
   - Windows: PowerShell `[System.Globalization.RegionInfo]::CurrentRegion.TwoLetterISORegionName`.
   - macOS: `defaults read -g AppleLocale` → split on `_`, take right side.
   - Linux: `localectl status` → `LANG=<xx_YY.UTF-8>` → extract `YY`.
2. **Locale env**: `$LC_ALL` → `$LANG` → parse `xx_YY...` → `YY`.
3. **Timezone → country**: system TZ via `Intl.DateTimeFormat().resolvedOptions().timeZone` (JS) / `date +%Z` / `readlink /etc/localtime`. Look up in `tz-country.json`. Ambiguous zones (not in table) → warn, ask user.
4. **Ask user**: prompt `Country (ISO-3166-1 alpha-2, e.g. RU, US, DE)?`.

**Auth:** N/A.

**Capabilities:**
- `read`: `detect_country()` → `{ country: "XX", method: "os-region|locale-env|tz-country|user", detected_at: ISO-8601 }`.
- `read`: `detect_timezone()` → IANA zone string.

**Output shape:**

```json
{ "country": "RU", "timezone": "Europe/Moscow", "method": "os-region", "detected_at": "2026-04-25T10:00:00Z" }
```

**Error taxonomy:** `unsupported` if all four probes fail (rare; ask-user should succeed). Never `auth`/`network`.

**Idempotency:** caller caches in memory key `jira:log-time:country` and `jira:log-time:country-detected-by`; re-probes after 30 days or on `--redetect` flag.

Target length: ~100–140 lines.

- [ ] **Step 3: Verify & Step 4: Commit**

```bash
git add plugins/misc/skills/integrations/references/location.md plugins/misc/skills/integrations/references/tz-country.json
git commit -m "feat(misc): add location aux connector with tz-country table"
```

---

### Task 10: Write `holidays.md` connector

**Files:**
- Create: `plugins/misc/skills/integrations/references/holidays.md`

- [ ] **Step 1: Write holidays.md**

**Class:** `aux`

**Probe order:**
1. **date.nager.at REST** (no auth, free): `GET https://date.nager.at/api/v3/publicholidays/{year}/{country}`. Response is an array of `{ date, localName, name, countryCode, fixed, global, counties, launchYear, types }`. 200 = available.
2. **Fallback**: if API unreachable, read user-provided `${CLAUDE_PLUGIN_DATA}/holidays-{country}-{year}.json` if present; else return empty with warning.

**Auth:** N/A.

**Capabilities:**
- `read`: `holidays_for(year, country)` → `Holiday[]`.
- Caching: responses cached at `${CLAUDE_PLUGIN_DATA}/holidays-{country}-{year}.json`. Cache is durable for the whole year; re-fetch on cache miss only.

**Output shape:**

```json
{ "date": "YYYY-MM-DD", "name": "string", "country": "XX", "type": "public|bank|school|observance" }
```

Only `type=public` matters for log-work catch-up; other types are surfaced for completeness.

**Error taxonomy:** `network` → fall through to cache-only; if cache miss and no API, return `[]` with warning `holidays unavailable for <country>-<year>` (log-work treats as "no holidays known, proceed").

**Idempotency:** cache file is the source of truth; year cache never invalidates (holidays are retrospective once the year starts; for future years, cache is rebuilt on year-roll).

Target length: ~80–120 lines.

- [ ] **Step 2: Verify & Step 3: Commit**

```bash
git add plugins/misc/skills/integrations/references/holidays.md
git commit -m "feat(misc): add holidays aux connector"
```

---

### Task 11: Write `bamboohr.md` connector

**Files:**
- Create: `plugins/misc/skills/integrations/references/bamboohr.md`

- [ ] **Step 1: Write bamboohr.md**

**Class:** `aux`

**Probe order:**
1. **BambooHR MCP**: tool names matching `mcp__*bamboo*__*`.
2. **BambooHR CLI**: probe `bamboo --version` or `bamboohr --version` (binary name varies; try both).
3. **BambooHR REST v1**: `GET https://api.bamboohr.com/api/gateway.php/{company}/v1/employees/{employee_id}` with Basic auth `{API_KEY}:x` (empty password slot). 200 = available.

**Auth:**
- `BAMBOOHR_API_KEY`, `BAMBOOHR_COMPANY`, `BAMBOOHR_EMPLOYEE_ID` (user's own id; or `self` when resolvable via `/employees/me`).

**Capabilities:**
- `read`-only in v1: `time_off_requests(from, to, employee_id=self)` → `TimeOff[]`.
- No `write` (avoid mutating HR system).

**Native endpoint:** `GET /time_off/requests?start={from}&end={to}&employeeId={id}&status=approved`.

**Output shape:**

```json
{
  "id": "string",
  "from": "YYYY-MM-DD",
  "to": "YYYY-MM-DD",
  "reason": "vacation|sick|personal|other",
  "status": "approved|pending|denied",
  "note": "string|null",
  "source": "bamboo",
  "external_ref": { "bamboo_id": "..." }
}
```

Reason-mapping: BambooHR `type.name` → normalized `reason` (document the mapping table inline; common cases: `Vacation`/`PTO`→`vacation`, `Sick`/`Sick Leave`→`sick`, `Personal`→`personal`, everything else → `other`).

**Error taxonomy & fallback:** per pattern. `auth` → stop (never silently skip HR access); `network` / `unsupported` → surface to caller, caller decides whether to proceed with local-only vacation store.

**Idempotency:** responses are cached per-run only (not persisted across runs; BambooHR state is live).

Target length: ~100–140 lines.

- [ ] **Step 2: Verify & Step 3: Commit**

```bash
git add plugins/misc/skills/integrations/references/bamboohr.md
git commit -m "feat(misc): add bamboohr aux connector"
```

---

### Task 12: Write `vacation-store.md` connector

**Files:**
- Create: `plugins/misc/skills/integrations/references/vacation-store.md`

- [ ] **Step 1: Write vacation-store.md**

**Class:** `aux`

**Probe order:** 1 layer — local filesystem, always available.

**Auth:** N/A.

**Capabilities:**
- `read`: `list_entries()` → `VacationEntry[]`.
- `write`: `add_entry(entry)`, `update_entry(id, patch)`, `remove_entry(id)`.
- `lock`: cooperative file-lock via `vacations.lock` sibling file (trivial; single-user; document that enforcement is best-effort, not crash-safe for multi-writer scenarios).

**Storage:** `${CLAUDE_PLUGIN_DATA}/vacations.json`. Atomic writes (tmp+rename). Corrupted file → rename to `vacations.json.bak`, start fresh, warn.

**Output shape:** matches `VacationEntry` in `log-vacation/references/store-schema.md`. Brief recap here:

```json
{
  "id": "uuid-v4",
  "from": "YYYY-MM-DD",
  "to": "YYYY-MM-DD",
  "reason": "vacation|sick|holiday|other",
  "note": "string|null",
  "source": "local|bamboo|merged",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601",
  "external_ref": { "bamboo_id": "..." }
}
```

**Validation on write:** `from <= to`, `from >= now - 1y`, `to <= now + 2y`, `reason ∈ enum`. Overlap policy: reject unless caller supplied `overlap_strategy ∈ {merge, replace, cancel}`.

**Error taxonomy:** `unsupported` only (filesystem errors surface as generic `server`-class with the OS message truncated to 200 chars).

**Idempotency:** each mutation is atomic; re-adding the same-shape entry twice → duplicate-detection via `(from, to, reason)` tuple → skip second with warning.

Target length: ~80–110 lines.

- [ ] **Step 2: Verify & Step 3: Commit**

```bash
git add plugins/misc/skills/integrations/references/vacation-store.md
git commit -m "feat(misc): add vacation-store aux connector"
```

---

### Task 13: Create `log-vacation` SKILL.md

**Files:**
- Create: `plugins/jira/skills/log-vacation/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

Frontmatter:

```yaml
---
name: log-vacation
description: Manage vacation / time-off entries for the current user. Supports list, add, remove, and sync (pull from BambooHR when available and merge with local JSON store). Produces deterministic output and a local source-of-truth that log-work consumes to gate the missing-days catch-up. Use when the user runs /jira:log-vacation, asks to record vacation, update time-off, check which dates are already marked off, or sync from BambooHR.
---
```

Body structure (mirrors `check-status` style):

1. **Prerequisite** — one-paragraph; reference `plugins/misc/skills/integrations/references/bamboohr.md` and `.../vacation-store.md`; note that local store is always available.
2. **Invocation** — syntax `/jira:log-vacation [list|add|remove|sync] [args]`; default `list`.
3. **Parameters** — table per subcommand:
   - `list`: `window=from,to` (default `from=now-90d`, `to=now+180d`).
   - `add`: `from`, `to`, `reason` (default `vacation`), `note`.
   - `remove`: `id` OR `from`[`,to`].
   - `sync`: no args.
4. **Phases**:
   - **Phase 0:** resolve connectors (probe bamboohr; vacation-store always on).
   - **Phase 1:** execute subcommand (see spec §6.3).
5. **Output contract** — deterministic table per spec §6.3; trailing `Source:` / `Generated:` lines.
6. **Idempotency** — reference `plugins/misc/skills/integrations/references/idempotency.md`. Specific rules: `add` of same `(from,to,reason)` → detect-and-warn; `remove` of nonexistent id → no-op with warning; `sync` deterministic against unchanged remote.
7. **Error handling** — per connector errors, plus corrupt-file recovery (backup+fresh).
8. **Integration contract with log-work** — read-only; `log-work` calls `list_entries()` to filter catch-up days.
9. **Examples** — 6–8 example invocations showing each subcommand and an overlap conflict flow.

Target length: ~150–250 lines.

- [ ] **Step 2: Verify**

Read back; confirm frontmatter valid, all 9 body sections present.

- [ ] **Step 3: Commit**

```bash
git add plugins/jira/skills/log-vacation/SKILL.md
git commit -m "feat(jira): add log-vacation skill"
```

---

### Task 14: Create `log-vacation/references/store-schema.md`

**Files:**
- Create: `plugins/jira/skills/log-vacation/references/store-schema.md`

- [ ] **Step 1: Write store-schema.md**

Content sections:

1. **File location:** `${CLAUDE_PLUGIN_DATA}/vacations.json`.
2. **Top-level schema:**

```json
{
  "version": 1,
  "entries": [ /* VacationEntry */ ]
}
```

3. **VacationEntry:** full JSON-schema-style description of each field (type, constraints, enum for `reason`, ISO-8601 format for dates/timestamps, uuid format for `id`). Include a worked example.
4. **Validation rules** — copied verbatim from `vacation-store.md` connector §validation.
5. **Migration policy** — `version` bumps: on load, if `version < current`, skill runs the upgrade pipeline in-place with an auto-backup to `vacations.v{old}.json.bak`.
6. **Overlap resolution policies** — `merge | replace | cancel` each explained with before/after examples.
7. **Conflict annotation rules for `list`** — how `⚠ conflict` is rendered when BambooHR and local disagree.
8. **Backup/recovery:** on corrupt load, rename to `vacations.json.bak`; create an empty valid file; log a user-visible warning.

Target length: ~120–180 lines.

- [ ] **Step 2: Verify & Step 3: Commit**

```bash
git add plugins/jira/skills/log-vacation/references/store-schema.md
git commit -m "feat(jira): add log-vacation store-schema reference"
```

---

### Task 15: Behavior-verify `log-vacation` end-to-end

- [ ] **Step 1: Load plugin**

Instruct user: in a Claude Code session, run
```
claude --plugin-dir ./plugins/jira --plugin-dir ./plugins/misc
```
Confirm `/jira:log-vacation` appears in `/help`.

- [ ] **Step 2: List empty state**

Run `/jira:log-vacation list`. Expected: empty table + trailing `Source: vacation-store=local`.

- [ ] **Step 3: Add an entry**

Run `/jira:log-vacation add from=2026-05-01 to=2026-05-03 reason=vacation note="May Day"`. Expected: confirmation line with new id.

- [ ] **Step 4: List populated**

Run `/jira:log-vacation list`. Expected: one row, `days=3`.

- [ ] **Step 5: Add overlapping, pick `cancel`**

Run `/jira:log-vacation add from=2026-05-02 to=2026-05-05 reason=vacation`. Expected: overlap warning + prompt; select `c`; list unchanged.

- [ ] **Step 6: Remove by id**

Run `/jira:log-vacation remove id=<id-from-step-3>`. Confirm `y`. Expected: entry gone; list empty.

- [ ] **Step 7: Sync (if BambooHR reachable)**

Run `/jira:log-vacation sync`. Expected: either the `+N added` summary or a clear `auth`/`unsupported` message if probe fails.

- [ ] **Step 8: Inspect file**

Read `${CLAUDE_PLUGIN_DATA}/vacations.json`; confirm schema matches `store-schema.md`; confirm no `.bak` files accumulated.

No commit for this task (verification only).

---

### Task 16: Create `log-work` SKILL.md

**Files:**
- Create: `plugins/jira/skills/log-work/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

Frontmatter:

```yaml
---
name: log-work
description: Interactively log 8h/day of Jira worklogs across 1–5 issues, including missing-day catch-up over a configurable lookback window. Collects source events (git commits, Jira activity) via connectors, proposes a distribution rounded to 30-minute steps, asks for confirmation, then writes worklogs through Tempo (primary) or native Jira (fallback). Creates ad-hoc Jira issues in the active sprint when no existing issue fits, after searching for a reusable candidate. Use when the user runs /jira:log-work, asks to log time, catch up on missed logging days, fill in a timesheet, or record work to Jira — including for specific dates or specific issue keys.
---
```

Body structure (mirrors `check-status` style, substantially larger):

1. **Prerequisite** — reference these connectors explicitly:
   - `plugins/misc/skills/integrations/references/connector-pattern.md` (read first)
   - `.../idempotency.md` (always applies)
   - `.../jira.md` (core)
   - `.../jira-activity.md` (source)
   - `.../git.md` (source)
   - `.../tempo.md` and `.../jira-worklog.md` (sinks; tempo first, fallback to jira-worklog)
   - `.../location.md` (country/tz)
   - `.../holidays.md` (catch-up filter)
   - `.../bamboohr.md` (optional vacation read)
   - `.../vacation-store.md` (vacation read)
2. **Invocation** — `/jira:log-work [date=today|YYYY-MM-DD] [target=8h] [lookback=7d] [project=KEY] [country=XX]`.
3. **Parameters** — table: `date`, `target`, `lookback`, `project`, `country`, `sources` (override enabled list), `sinks` (override priority), `step` (rounding, default `30m`), `redetect` (bool, force re-probe of country).
4. **Configuration** — reference `plugins/jira/skills/log-work/references/config-schema.md`. Document precedence: CLI arg → memory key → config file → built-in default.
5. **Pipeline overview** — point at `plugins/jira/skills/log-work/references/pipeline.md` for the per-phase flow; summarize as 4 phases (context, catch-up scan, per-day loop, final report).
6. **Ad-hoc task creation flow** — per spec §5.5; include the search JQL template, issue-type default, label, sprint assignment rule.
7. **Output contract** — what's printed between phases, final report table, trailing `JQL:` / `Source:` / `Generated:` lines. Must be deterministic per `idempotency.md`.
8. **Idempotency guarantees** — quote the specific rules from spec §5.6 that apply here.
9. **Error handling** — per spec §5.7.
10. **Cloud vs on-prem notes** — Cloud default path (API v3, ADF comments, `nextPageToken`); on-prem notes (v2, plain text comments, `startAt`); refer to `jira.md` for details.
11. **Argument examples** — ≥10 examples showing common flows: default, explicit date, explicit project, `lookback=30d`, `target=6h`, override sinks, redetect, catch-up of a single past day by date, creating an ad-hoc task with a title matching an existing issue (reuse path), etc.

Target length: ~300–450 lines (sits just under the 500-line budget; any additional detail goes into the references).

- [ ] **Step 2: Verify**

Read back; confirm frontmatter, all 11 sections, every referenced file path spelled correctly (grep).

- [ ] **Step 3: Commit**

```bash
git add plugins/jira/skills/log-work/SKILL.md
git commit -m "feat(jira): add log-work skill"
```

---

### Task 17: Create `log-work/references/pipeline.md`

**Files:**
- Create: `plugins/jira/skills/log-work/references/pipeline.md`

- [ ] **Step 1: Write pipeline.md**

Content — detailed per-phase flow exactly mirroring spec §5.4, expanded with specific steps, prompts the user sees, and fallback decisions at each step:

- **Phase 0: resolve context** — sub-steps for capturing `now`, resolving `project` (arg → memory → prompt), resolving `country` (arg → memory → location connector probe chain → prompt), loading and merging config.
- **Phase 1: catch-up scan** — build working-day set, query worklogs per day through `jira`, classify `full | partial | empty`, render selection prompt. Describe exact prompt text and accepted responses (`accept` / `pick=YYYY-MM-DD,YYYY-MM-DD` / `skip-all`).
- **Phase 2: per-day interactive loop** — for each selected day:
  - parallel source fetch (git, jira-activity, others enabled);
  - grouping + raw_weight normalization + rounding algorithm (explicit pseudocode);
  - interactive edit prompt — full command grammar: `KEY=Xh[Ym]`, `+Xh on KEY`, `-Ym on KEY`, `rm KEY`, `add`, `accept`;
  - the `add` sub-flow per spec §5.5;
  - deviation warning at `accept` time with the three responses (`a`/`r`/`e`);
  - comment prompt with default template and overrides;
  - dry-run summary and final `y/N`;
  - write loop through tempo (fallback jira-worklog), with per-issue duplicate detection;
  - per-day summary format.
- **Phase 3: final report** — table columns, trailing lines format.

Include ASCII diagrams of prompt sequences where helpful. Include explicit pseudocode for the distribution algorithm:

```
total_weight = sum(events.raw_weight)
for issue_key, events in grouped:
  share = sum(e.raw_weight for e in events) / total_weight
  raw_minutes = share * target_minutes
  rounded = round(raw_minutes / step_minutes) * step_minutes
  allocation[issue_key] = rounded
residue = target_minutes - sum(allocation.values())
if residue != 0:
  highest = issue with max sum(raw_weight)
  allocation[highest] += residue
```

Target length: ~300–500 lines.

- [ ] **Step 2: Verify & Step 3: Commit**

```bash
git add plugins/jira/skills/log-work/references/pipeline.md
git commit -m "feat(jira): add log-work pipeline reference"
```

---

### Task 18: Create `log-work/references/config-schema.md`

**Files:**
- Create: `plugins/jira/skills/log-work/references/config-schema.md`

- [ ] **Step 1: Write config-schema.md**

Content:

1. **File location:** `${CLAUDE_PLUGIN_DATA}/log-work.json`.
2. **Top-level schema:**

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
  "lookback_default_days": 7,
  "day_start_local": "09:00",
  "git_repos": ["/abs/path/to/repo"],
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

3. **Per-field documentation** — type, constraints, default, example, effect on pipeline.
4. **Precedence** — CLI arg > env var (if any) > memory > config file > built-in default.
5. **Write behavior** — config is only written on first successful run (defaults materialized). Subsequent runs read-only. Users edit the file manually when they need to change defaults.
6. **Migration** — `version` field is implicit `1`; future bumps follow the store-schema pattern.
7. **Example config** — one realistic populated example.

Target length: ~140–200 lines.

- [ ] **Step 2: Verify & Step 3: Commit**

```bash
git add plugins/jira/skills/log-work/references/config-schema.md
git commit -m "feat(jira): add log-work config-schema reference"
```

---

### Task 19: Behavior-verify `log-work` end-to-end

- [ ] **Step 1: Reload plugin, verify discovery**

User: `claude --plugin-dir ./plugins/jira --plugin-dir ./plugins/misc`. Run `/help`; confirm `/jira:log-work` shows with its description.

- [ ] **Step 2: Dry run on today with no work done**

Run `/jira:log-work date=today`. Expected: Phase 1 shows today as `empty`; proceeds to Phase 2; source fetch yields zero events if user has no commits / Jira activity today; skill prompts for `add` to create an ad-hoc entry. Exit without writing.

- [ ] **Step 3: Catch-up run over 7 days**

Run `/jira:log-work`. Expected: lists all working days in window with per-day logged-minutes status; user picks one partial day; skill proposes a distribution based on collected events; user accepts; skill writes via tempo (or falls through to jira-worklog); final report shows the written issues and the `Source:` line indicating `sink=tempo` or `sink=jira-worklog`.

- [ ] **Step 4: Idempotent re-run**

Re-run the same `/jira:log-work` for the same day. Expected: Phase 1 classifies the day as `full` (or partial-with-delta-0) and skips it.

- [ ] **Step 5: Ad-hoc task with title matching existing issue**

Run `/jira:log-work`, use `add`, enter a title that matches an existing issue's summary. Expected: skill shows top-5 candidates; user picks one; no new issue created; worklog written to the picked issue.

- [ ] **Step 6: Ad-hoc task creating new issue**

Run `/jira:log-work`, use `add`, enter a unique title, pick `new`. Expected: new issue created in the active sprint with the `auto-logged` label; worklog written to it.

- [ ] **Step 7: Deviation warning**

Edit the distribution to sum to 6h (< 8h); accept. Expected: skill warns once (deviation > 5%); select `accept`. Write proceeds with 6h total.

- [ ] **Step 8: Vacation gating**

Add a vacation entry covering a day in the lookback window via `/jira:log-vacation add …`. Re-run `/jira:log-work`. Expected: Phase 1 excludes that day from the working-day set.

No commit.

---

### Task 20: Refactor `check-status` SKILL.md to reference shared docs

**Files:**
- Modify: `plugins/jira/skills/check-status/SKILL.md`

- [ ] **Step 1: Replace the "Prerequisite" section**

Open the file; locate lines 10–22 (the current `Prerequisite` section block starting with `## Prerequisite` and ending at the `Always record which source was used…` line).

Replace with:

```markdown
## Prerequisite

Jira connector is described in `plugins/misc/skills/integrations/references/jira.md`. Use its probe order (MCP → acli → REST Cloud → REST on-prem), auth rules, and error taxonomy. Record the resolved layer in the trailing `Source:` line.
```

- [ ] **Step 2: Replace the "Idempotency" section**

Locate the `## Idempotency` block (lines 242–249 in the original). Replace its body (not the heading) with:

```markdown
This skill follows the rules in `plugins/misc/skills/integrations/references/idempotency.md`: single `now` capture, stable sort keys, `—` sentinel for missing values, atomic writes for any cached files. Two runs against identical Jira state produce byte-identical output except for the `Generated:` line.
```

- [ ] **Step 3: Verify**

Read the file; confirm sections trimmed, all references resolve (file paths exist under `plugins/misc/skills/integrations/references/`).

- [ ] **Step 4: Commit**

```bash
git add plugins/jira/skills/check-status/SKILL.md
git commit -m "refactor(jira): replace inline sections in check-status with shared connector refs"
```

---

### Task 21: Behavior-verify `check-status` unchanged

- [ ] **Step 1: Run check-status**

Run `/jira:check-status` in a loaded plugin session. Expected: same output shape as before the refactor (title, progress bars, blockers section, per-type tables, trailing `JQL:`/`Source:`/`Generated:` lines). No regressions.

- [ ] **Step 2: Spot-check Source line**

Confirm `Source:` still reports the resolved layer (`atlassian-mcp` | `acli` | `cloud-rest` | `server-rest`). Since the shared reference preserves the probe order, behavior must be identical.

No commit.

---

### Task 22: Bump `plugins/jira/.claude-plugin/plugin.json`

**Files:**
- Modify: `plugins/jira/.claude-plugin/plugin.json`

- [ ] **Step 1: Update manifest**

Read current content; bump `version` to `0.2.0`; append `"time-tracking"`, `"worklog"`, `"vacation"` to the `keywords` array.

Target file content:

```json
{
  "name": "jira",
  "version": "0.2.0",
  "description": "Jira workflow skills",
  "author": {
    "name": "Viperwow",
    "email": "viperkodiak@gmail.com"
  },
  "keywords": ["jira", "workflow", "ticketing", "time-tracking", "worklog", "vacation"]
}
```

- [ ] **Step 2: Verify**

JSON parses; version bumped; new keywords present.

- [ ] **Step 3: Commit**

```bash
git add plugins/jira/.claude-plugin/plugin.json
git commit -m "chore(jira): bump version to 0.2.0 for time-logging skills"
```

---

### Task 23: Bump `plugins/misc/.claude-plugin/plugin.json`

**Files:**
- Modify: `plugins/misc/.claude-plugin/plugin.json`

- [ ] **Step 1: Update manifest**

Read current content; bump `version` (patch → minor if new top-level skill added; it is — `integrations`); append `"integrations"` to `keywords` if absent.

Example target state (adjust to actual current fields):

```json
{
  "name": "misc",
  "version": "<prev-minor+1>.0",
  "description": "Miscellaneous productivity skills and shared connector references",
  "author": {
    "name": "Viperwow",
    "email": "viperkodiak@gmail.com"
  },
  "keywords": ["productivity", "integrations"]
}
```

- [ ] **Step 2: Verify & Step 3: Commit**

```bash
git add plugins/misc/.claude-plugin/plugin.json
git commit -m "chore(misc): bump version; add integrations meta-skill keyword"
```

---

## Self-review checklist (run after all tasks complete)

- [ ] Every connector reference file has all 7 required sections from `connector-pattern.md`.
- [ ] Every `SKILL.md` has valid YAML frontmatter with a description that triggers on realistic user phrases.
- [ ] `log-work` and `log-vacation` reference every connector they depend on by exact path.
- [ ] `check-status` still passes behavior verification after the refactor.
- [ ] No file contains `TBD`, `TODO`, or placeholder text.
- [ ] All JSON schemas validate (load and parse in a JSON parser before committing).
- [ ] Commit graph is clean and linear; each task produced one commit (or fewer, never more) with a conventional-commits-style message.
- [ ] `${CLAUDE_PLUGIN_DATA}/` paths are referenced consistently (never absolute Windows paths hardcoded).

---

## Out-of-scope reminders (per spec §3 and §9)

- No scheduled runs, no `Stop` hook — deferred.
- No background draft generation — deferred.
- No Tempo analytics.
- No writing over existing worklogs — skill only adds the missing delta.
- No automated test harness — verification is behavioral via manual skill invocation.
