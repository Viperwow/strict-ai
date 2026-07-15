# Conventional type → keepachangelog section

Default mapping. Override by editing this table; the skill reads it as the source of truth.

| Conventional type | keepachangelog section |
|-------------------|------------------------|
| `feat`            | Added                  |
| `fix`             | Fixed                  |
| `perf`            | Changed                |
| `refactor`        | Changed                |
| `remove`          | Removed                |
| `security`        | Security               |
| `deprecate`       | Deprecated             |
| `docs`            | Changed                |
| `chore`           | Changed                |
| `test`            | Changed                |
| `build`           | Changed                |
| `ci`              | Changed                |
| `style`           | Changed                |

No dropped types — every commit lands in a section.

## Rules

- A breaking change (`!` after type/scope, or `BREAKING CHANGE:` trailer) that removes
  public surface maps to **Removed**; otherwise it stays in its type's section but the
  slug is prefixed `**BREAKING** `.
- A **typed** commit whose type is absent from the table above is treated as
  **Changed**.
- A **typeless** (non-conventional) subject has no type token to look up, but its
  content almost always fits one of the sections above (a typo/bug fix → Fixed, a new
  capability → Added, a removed capability → Removed, etc.) — classify it there, same
  as a human curator would. Never a default/catch-all bucket; only fall back to
  **Changed** if the content genuinely doesn't indicate any other section. A typeless
  subject has no scope; the slug is the whole subject.
