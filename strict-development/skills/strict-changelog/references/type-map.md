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

## Dropped types (not user-facing — excluded from the changelog)

`docs`, `chore`, `test`, `build`, `ci`, `style`. A **typeless** (non-conventional)
subject — no `type:` token at all — carries no conventional-commit signal and is
dropped the same way; never guessed into a section.

## Rules

- A breaking change (`!` after type/scope, or `BREAKING CHANGE:` trailer) that removes
  public surface maps to **Removed**; otherwise it stays in its type's section but the
  slug is prefixed `**BREAKING** `.
- A **typed** commit whose type is absent from both tables above is treated as
  **Changed**.
