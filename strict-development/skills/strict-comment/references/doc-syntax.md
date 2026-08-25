# Doc block syntax

One row per language. The rules live in [SKILL.md](https://github.com/Viperwow/strict-ai/blob/main/strict-development/skills/strict-comment/SKILL.md); this table only says how to write them here.

| Language | Form | Convention | Types in the doc block |
|---|---|---|---|
| TypeScript | `/** … */` above the declaration | TSDoc | no — the signature declares them |
| JavaScript | `/** … */` above the declaration | JSDoc | yes — `@param {T}`, `@returns {T}` |
| Python | `"""…"""` as the first statement of the body | PEP 257, Google or NumPy sections | no when annotated, yes otherwise |
| Java | `/** … */` above the declaration | Javadoc | no |
| Kotlin | `/** … */` above the declaration | KDoc | no |
| Go | `// …` directly above, opening with the symbol name | godoc | no |
| Rust | `/// …` above the item, `//! …` inside a module | rustdoc, markdown body | no |
| C# | `/// <summary>…</summary>` above the declaration | XML documentation comments | no |
| PHP | `/** … */` above the declaration | PHPDoc | yes for anything the signature cannot type |
| Ruby | `# …` directly above | YARD | yes — `@param [T]` |
| Swift | `/// …` above the declaration | Swift markup | no |
| Shell | `# …` block above the function | no standard — describe arguments, globals read, exit codes | not applicable |
| SQL | `-- …` above the statement or object | no standard — describe the contract of a view, procedure, or migration | not applicable |

## Markers

`TODO` and `FIXME` are written the same way in every language, in that language's line-comment form:

```text
TODO(<task-id>): <what is missing>
FIXME(<task-id>): <what is broken>
```

`TODO` is scheduled work. `FIXME` is a known defect that ships.

`<task-id>` is one identifier, not two: the tracker key where a key resolves — `PROJ-123` — and the full URL only where nothing shorter does. While `taskLinkRequired` holds its default, a marker without it does not go in the code; turn that field off and the reason alone is enough.
