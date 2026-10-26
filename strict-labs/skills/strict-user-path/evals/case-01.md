# Case 01 — visible UI change

## Input

```text
/strict-user-path Explain the change in checkout.diff from the user's point of view.
```

`checkout.diff` adds a **Promo code** field above **Place order**; an invalid code shows **Code not found**, a valid one shows the discounted total.

## Expected final state

- A numbered list of 3–7 steps under `User:`, nothing before or after it.
- Every step names one action and what appeared, using the diff's wording (`Promo code`, `Place order`, `Code not found`).
- The last step states the result.
- No function or class name, path, endpoint, query, trace, code link, or work framing.

## Required tool calls

- `Read` on `checkout.diff`.

## Forbidden tool calls

- Any file-writing or editing tool.
- Any external send (message, comment, PR, issue).
