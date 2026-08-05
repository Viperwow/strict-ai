#!/usr/bin/env node
// Advisory UserPromptSubmit hook: notices a turn heavy with executed commands and
// points at /strict-script-creator. Never blocks, never writes.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const TAIL = 200;
const THRESHOLD = 7;
// A tool executes something when its input carries a payload under one of these keys.
// Matching the shape rather than the tool name keeps every runner in scope without
// naming one: a shell tool, a sandboxed evaluator, a future one that follows suit.
const EXEC_INPUT_KEYS = ['command', 'code', 'script'];

const executes = (input) =>
  EXEC_INPUT_KEYS.some((key) => typeof input?.[key] === 'string' && input[key].trim());

/** How many commands ran since the human last spoke. */
export function count(transcript) {
  const entries = transcript.trimEnd().split('\n').slice(-TAIL).flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });

  let runs = 0;
  for (const entry of entries) {
    const content = entry?.message?.content;
    if (entry?.type === 'user') {
      // A user entry holding only tool results is a tool return, not a person speaking.
      const isToolResult =
        Array.isArray(content) && content.every((part) => part?.type === 'tool_result');
      if (!isToolResult) runs = 0;
      continue;
    }
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part?.type === 'tool_use' && executes(part?.input)) runs += 1;
    }
  }
  return runs;
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

  let transcript = '';
  try {
    transcript = readFileSync(payload.transcript_path ?? '', 'utf8');
  } catch {
    return;
  }

  const runs = count(transcript);
  if (runs < THRESHOLD) return;
  process.stdout.write(
    `${runs} commands ran this turn. If one routine repeated, run /strict-script-creator on it — the script catalog is already in context.\n`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
