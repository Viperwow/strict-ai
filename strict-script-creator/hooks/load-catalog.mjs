#!/usr/bin/env node
// SessionStart hook: puts the script catalog in context once per session, so reuse,
// "already automated", and "decided against" all cost nothing to check later.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_LINES = 40;

export function catalog(registry) {
  const lines = registry.trim().split('\n').filter((line) => line.trim());
  if (!lines.length) return '';
  const shown = lines.slice(0, MAX_LINES);
  if (lines.length > MAX_LINES) {
    shown.push(
      `…and ${lines.length - MAX_LINES} more in .strict-ai/scripts/README.md — a folder this size is what /strict-script-creator --cleanup is for.`,
    );
  }
  return ['Scripts available in this project:', ...shown].join('\n');
}

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  let payload;
  try {
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return;
  }

  let registry = '';
  try {
    registry = readFileSync(join(payload.cwd ?? '.', '.strict-ai', 'scripts', 'README.md'), 'utf8');
  } catch {
    return;
  }

  const text = catalog(registry);
  if (text) process.stdout.write(`${text}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
