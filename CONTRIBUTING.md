# Contributing

## Branches

Start a focused branch from an up-to-date `main`. Use `<type>/<short-topic>` with a lowercase kebab-case topic, for example `feat/strict-mod-creator`, `fix/mod-typecheck`, `docs/mod-creation`, or `ci/commitlint`. Use the conventional commit type that describes the work; omit personal prefixes and generated workspace names. Open a pull request into `main`.

This follows the branch naming used in Whispio/erindi. Naming is a contributor convention; no separate branch-name validator is installed.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `type(scope): short description`. Scope is optional; use the package or subsystem when useful. Keep the subject lowercase and the complete header at most 100 characters. Keep commits focused and omit AI attribution trailers.

Examples:

```text
feat(strict-mod-creator): add mod creation workflow
fix(strict-mod-creator): include host-generated declarations
test(strict-mod-creator): cover force-push policy
ci: check pull request commits with commitlint
```

Install Node.js 22 or later and pnpm 10, then run `pnpm install` at the repository root once. Husky installs the `commit-msg` hook, which checks messages with `@commitlint/config-conventional`. CI checks all commits between the pull request's base and head with the same configuration and a frozen lockfile.

The Husky hooks also forward to existing hooks under the shared Git directory's `hooks/`, preserving integrations such as Entire in ordinary clones and linked worktrees. Forwarded hooks keep their own exit status. In a linked worktree, installation sets `core.hooksPath` in that worktree's configuration and restores the shared setting, so other checkouts keep their hooks. If a clone already has a custom `core.hooksPath`, inspect that integration before replacing it with Husky.

This setup checks commit messages; it does not introduce automatic releases or change package versioning.
