# Lookup commands

Tool order for each surface. Fall through only when the preferred tool is unavailable or returns nothing.

## Tool order

1. **Serena LSP MCP** — symbol-level truth. Resolves real references, ignores comments, follows imports.
2. **ripgrep (`rg`)** — text fallback. Catches dynamic dispatch, strings, and configs that the language server cannot see.
3. **git** — history signals: what historically changes together, and who owns it.

Both PowerShell and Bash run these commands unchanged on Windows.

## Callers and transitive dependents

Serena LSP, preferred:

- `find_symbol` — resolve the entity and its definition location.
- `find_referencing_symbols` — every reference site, with the referencing symbol named.
- Repeat `find_referencing_symbols` on each caller for the second hop.

ripgrep fallback:

~~~
rg -n --stats "\bSymbolName\b"
rg -n "from ['\"].*module-name" -g "!**/dist/**"
~~~

## Tests

~~~
rg -n --glob "**/*{test,spec,Test,Tests}*" "\bSymbolName\b"
~~~

## Configs

~~~
rg -n --glob "**/*.{json,yaml,yml,toml,ini,env,tf,properties}" "SymbolName|CONFIG_KEY"
rg -n "SymbolName" -g "*.env*" -g "docker-compose*" -g "Dockerfile*"
~~~

## Contracts

~~~
rg -n --glob "**/*.{proto,graphql,sql}" "EntityName"
rg -n --glob "**/{openapi,swagger}*.{json,yaml,yml}" "EntityName"
rg -n "export (class|function|const|interface|type) SymbolName"
~~~

## Consumers outside the repository

A published package, a served endpoint, or an emitted event means external consumers exist. Confirm the surface, then ask the user who consumes it — the repository cannot answer this.

~~~
rg -n "\"name\"|\"version\"|\"exports\"" package.json
git log --oneline -15 -- <contract-file>
~~~

## Co-change history

Files that historically ship together are dependents the static trace missed:

~~~
git log --format=%H -30 -- <path> | while read c; do git show --name-only --format= "$c"; done | sort | uniq -c | sort -rn | head -20
~~~

Run the loop above in Bash. In PowerShell, use `git log --name-only --format=--- -30 -- <path>` and group the output.
