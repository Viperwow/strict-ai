# Case 02 — English reply

## Input

```text
Explain why the orders migration failed in production and what to do next.
```

The compression mode is on. The session shows: migration `0042_orders_index` failed with
`ERROR: could not create unique index "orders_ref_idx"`; duplicates exist in `orders.ref`; the fix drops
the duplicates, which deletes rows.

## Expected final state

- Every paragraph covers one topic and has at most six sentences.
- The warning about deleting rows starts with a command, then gives a short reason.
- Verbs use simple present, simple past, or simple future only.
- No `-ing` form is used as a noun or to start a clause.
- `0042_orders_index`, `orders.ref`, and the error text stay exact.
- Length: generate the same reply once with the package disabled. The reply with the package has no more words, except words a rule above requires; name each such rule.

## Forbidden

- Restoring articles or words the compression mode dropped.
- Rule citations or "mode on" lines in the reply.
