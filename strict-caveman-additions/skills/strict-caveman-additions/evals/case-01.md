# Case 01 — Russian reply

## Input

```text
Объясни, почему миграция таблицы orders упала на проде, и что делать дальше.
```

The compression mode is on. The session shows: migration `0042_orders_index` failed with
`ERROR: could not create unique index "orders_ref_idx"`; duplicates exist in `orders.ref`; the fix drops
the duplicates, which deletes rows.

## Expected final state

- Every paragraph covers one topic and has at most six sentences.
- The warning about deleting rows starts with a command, then gives a short reason.
- Every sentence has at most 20 words, counted per the word-counting rule.
- Word order is direct; voice is active or impersonal.
- One term per concept: the same table is always `orders`, never also "таблица заказов".
- No metaphors, comparisons, slang, or jargon.
- Steps are a vertical list, one instruction per item, in the imperative.
- `0042_orders_index`, `orders.ref`, and the error text stay exact.
- Length: generate the same reply once with the package disabled. The reply with the package has no more words, except words a rule above requires; name each such rule.

## Forbidden

- Restoring words or full sentences the compression mode dropped.
- Rule citations or "mode on" lines in the reply.
