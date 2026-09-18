# Cache schema

**Path:** `.strict-ai/cache/strict-best-practices/<bp-slug>-<short-id>.json`

**Default:** `--cache on`, `--cache-ttl 30d`.

Store **raw acquired data only**. Recompute encounter, trends, alignment every run. Cache scope-irrelevant sources too — relevance is per run.

Before external search: scan cache directory; reuse entries within TTL; merge on hit.

## File contract

Filename: `<bp-slug>-<short-id>.json`. JSON `id` is the short id only; `slug` is separate.

```json
{
  "id": "a7f3",
  "slug": "cursor-pagination",
  "cachedAt": "2026-09-13T10:00:00Z",
  "external": [
    {
      "url": "https://example.com/post",
      "title": "Pagination at scale",
      "author": "Jane Doe",
      "timestamp": "2025-03-12T14:30:00Z",
      "quote": "Cursor pagination avoids OFFSET cost on large tables."
    }
  ],
  "internal": [
    {
      "path": "api/handlers/list.go",
      "startLine": 42,
      "endLine": 58,
      "quote": "return decodeCursor(r.URL.Query().Get(\"cursor\"))"
    }
  ]
}
```

## Rules

- One value per field — atomic (`startLine`, `endLine`, not `lines 42-58`).
- Timestamps: UTC ISO 8601.
- Merge external by `url`; internal by `path` + line range.
- Optional internal keys when present: `section`, `startColumn`, `endColumn`.
- Do not store: rates, trends, alignment, inclusion state, exclusion lists.

`--cache refresh`: ignore TTL and re-fetch. `--cache off`: read-only use of session; no writes.
