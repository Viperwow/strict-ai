#!/usr/bin/env node
// Repo-local debug helper: link skills from this checkout into the agent's skills
// directory, so edits here take effect without publishing or reinstalling.
//
//   node scripts/dev-link.mjs list
//   node scripts/dev-link.mjs on  <skill | package | all>
//   node scripts/dev-link.mjs off <skill | package | all>

import { existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, rmSync, symlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(homedir(), '.claude', 'skills');
// Windows refuses ordinary directory symlinks without elevation; a junction is the
// one form an unprivileged user can create, and it resolves the same for readers.
const LINK_TYPE = process.platform === 'win32' ? 'junction' : 'dir';

const dirs = (path) => {
  try {
    return readdirSync(path, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
};

/** Every skill in the checkout: which package holds it and where it lives. */
export function discover(repo = REPO) {
  return dirs(repo)
    .filter((pkg) => pkg.startsWith('strict-'))
    .flatMap((pkg) =>
      dirs(join(repo, pkg, 'skills'))
        .filter((skill) => existsSync(join(repo, pkg, 'skills', skill, 'SKILL.md')))
        .map((skill) => ({ pkg, skill, source: join(repo, pkg, 'skills', skill) })),
    );
}

/** Where a link points, or null when the path is absent or not ours to touch. */
export function linkTarget(path) {
  try {
    if (!lstatSync(path).isSymbolicLink()) return null;
    return readlinkSync(path);
  } catch {
    return null;
  }
}

const selected = (entries, name) =>
  name === 'all' ? entries : entries.filter((e) => e.skill === name || e.pkg === name);

function link({ skill, source }) {
  const path = join(TARGET, skill);
  const current = linkTarget(path);
  if (current && resolve(current) === resolve(source)) return `${skill}: already linked`;
  if (existsSync(path) && !current) return `${skill}: SKIPPED, a real directory is in the way`;
  if (current) rmSync(path, { recursive: true, force: true });
  mkdirSync(TARGET, { recursive: true });
  symlinkSync(source, path, LINK_TYPE);
  return `${skill}: linked`;
}

function unlink({ skill }) {
  const path = join(TARGET, skill);
  if (!linkTarget(path)) return `${skill}: not linked`;
  rmSync(path, { recursive: true, force: true });
  return `${skill}: unlinked`;
}

function list(entries) {
  const width = Math.max(...entries.map((e) => e.skill.length));
  return entries.map((e) => {
    const current = linkTarget(join(TARGET, e.skill));
    const state = !current ? '—' : resolve(current) === resolve(e.source) ? 'linked' : `linked elsewhere: ${current}`;
    return `${e.skill.padEnd(width)}  ${e.pkg.padEnd(width)}  ${state}`;
  }).join('\n');
}

function main([command, name]) {
  const entries = discover();
  if (command === 'list' || !command) return list(entries);

  if (!name) return 'Name a skill, a package, or "all".';
  const picked = selected(entries, name);
  if (!picked.length) return `Nothing matches "${name}". Run list to see what is here.`;

  if (command === 'on') return picked.map(link).join('\n');
  if (command === 'off') return picked.map(unlink).join('\n');
  return `Unknown command "${command}". Use list, on, or off.`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(main(process.argv.slice(2)));
}
