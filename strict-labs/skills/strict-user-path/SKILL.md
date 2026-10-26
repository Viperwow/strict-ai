---
name: strict-user-path
description: Use when an answer must describe a change from the end user's perspective — what a person opens, sees, clicks, and gets on screen, with no code and no implementation. Invoke when the user asks "from the user's point of view", "what would the end user see", "give me the user path", or asks to explain a feature, PR, diff, or task to someone who only uses the product. Triggers on /strict-user-path.
---

# strict-user-path

Answer from the end user's chair: they open something, see something, do something, get a result. Everything under that surface is out of scope.

## Invocation

`/strict-user-path [feature, PR, diff, or task]` — without the argument, the subject is whatever the session is discussing.

## Rules

1. One step is one action plus what appeared: opened → saw → entered → clicked → got.
2. Name things as the interface names them, keeping labels in the interface's own language; write the rest in the language of the request.
3. End on what the user gets — success, error, or empty state.
4. Never write a function or class name, file path, endpoint, query, trace, code link, or work framing ("we added", "the handler now").
5. Never invent a screen. When context shows none, say in one line that the change is not visible from outside, add at most one line on an indirect effect, and ask at most one question.
6. Break these only when the user explicitly asks for the implementation.

## Output

```text
User:
1. Opens <screen / section>
2. Sees <field / list / empty state>
3. Enters <input> or clicks <button>
4. Sees <result>
```

3–7 steps. No preamble before step 1, no summary after the last one.

## Example

- Bad: `submitOrder()` validates `cartId`, then `OrderService` writes the row and returns 201.
- Good: Taps **Place order**. Sees **Order accepted** and an order number.
