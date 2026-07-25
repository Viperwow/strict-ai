# AGENTS.md

See `CLAUDE.md` for the repository structure contract, package routing rules, and authoring conventions. This file adds environment/run notes for automated agents.

## Cursor Cloud specific instructions

This repo is a **Claude Code plugin marketplace** (`strict-ai`): only Markdown skills (`**/SKILL.md`) and JSON manifests (`.claude-plugin/marketplace.json`, `<package>/.claude-plugin/plugin.json`). There is no build system, no server, and no application to boot — the "app" that consumes this repo is the Claude Code CLI.

### Tooling

- The Claude Code CLI (`claude`) is the dev tool for this repo. The update script installs it to `~/.npm-global` and it is on `PATH` via `~/.bashrc` (bin dir `~/.npm-global/bin`).
- Do NOT export `NPM_CONFIG_PREFIX`: nvm warns and refuses when it is set. The install intentionally uses `npm install -g --prefix "$HOME/.npm-global" ...` (a flag) instead of that env var.

### Lint / test (validate manifests + skill frontmatter)

- Marketplace: `claude plugin validate .`
- A single plugin (also validates its skills' YAML frontmatter): `claude plugin validate ./<package>` (e.g. `./strict-workday`).
- Known pre-existing failure: `claude plugin validate ./strict-labs` fails because `strict-labs/skills/strict-grep/SKILL.md` has malformed YAML frontmatter. This is a content bug, not an environment issue.

### Run (hello-world for a marketplace)

```
claude plugin marketplace add /workspace
claude plugin install strict-workday@strict-ai
claude plugin list                       # shows enabled plugin
claude plugin details strict-workday     # shows loaded skills + token cost
```

`claude plugin validate` / `marketplace add` / `install` / `list` / `details` are local operations and do not require Claude auth.

### Marketplace sync note

`.claude-plugin/marketplace.json` publishes only a subset of packages (currently `strict-workday`, `strict-labs`, `strict-development`, `strict-agents`). Other `strict-*` packages exist but are unpublished. Per `CLAUDE.md`, keep `marketplace.json` and the README availability note in sync when a package gains/loses skills.
