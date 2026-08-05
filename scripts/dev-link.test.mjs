#!/usr/bin/env node
// Run: node scripts/dev-link.test.mjs
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collisions, discover, linkTarget } from './dev-link.mjs';

const root = mkdtempSync(join(tmpdir(), 'dev-link-'));
const skill = join(root, 'strict-demo', 'skills', 'demo-skill');
mkdirSync(skill, { recursive: true });
writeFileSync(join(skill, 'SKILL.md'), '---\nname: demo-skill\n---\n');
mkdirSync(join(root, 'strict-demo', 'skills', 'no-manifest'), { recursive: true });
mkdirSync(join(root, 'not-a-package', 'skills', 'other'), { recursive: true });

assert.deepEqual(
  discover(root).map((e) => `${e.pkg}/${e.skill}`),
  ['strict-demo/demo-skill'],
);

assert.deepEqual(collisions(discover(root)), []);
assert.deepEqual(
  collisions([
    { pkg: 'strict-a', skill: 'shared' },
    { pkg: 'strict-b', skill: 'shared' },
    { pkg: 'strict-a', skill: 'alone' },
  ]),
  [['shared', ['strict-a', 'strict-b']]],
);

const link = join(root, 'link');
symlinkSync(skill, link, process.platform === 'win32' ? 'junction' : 'dir');
assert.ok(linkTarget(link), 'a symlink reports its target');
assert.equal(linkTarget(skill), null, 'a real directory is never treated as a link');
assert.equal(linkTarget(join(root, 'missing')), null, 'an absent path is not a link');

rmSync(root, { recursive: true, force: true });
console.log('ok');
