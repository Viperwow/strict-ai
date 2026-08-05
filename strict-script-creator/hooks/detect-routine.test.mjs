#!/usr/bin/env node
// Run: node strict-script-creator/hooks/detect-routine.test.mjs
import assert from 'node:assert/strict';
import { count } from './detect-routine.mjs';
import { catalog } from './load-catalog.mjs';

const line = (entry) => JSON.stringify(entry);
const call = (name, input) => line({ type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } });
const prompt = (text) => line({ type: 'user', message: { content: text } });
const result = () => line({ type: 'user', message: { content: [{ type: 'tool_result', content: 'ok' }] } });

const runs = (n, entry) => Array.from({ length: n }, () => entry);

// Any tool carrying an executable payload counts, whatever it is called.
const mixed = [
  prompt('ship it'),
  ...runs(4, call('Bash', { command: 'npm test' })),
  ...runs(3, call('SomeSandbox', { code: 'print(1)' })),
  ...runs(5, call('Read', { file_path: '/a.js' })),
  result(),
].join('\n');
assert.equal(count(mixed), 7);

// A real user message resets the count; a tool result does not.
assert.equal(count([mixed, prompt('now deploy'), call('Bash', { command: 'npm test' })].join('\n')), 1);

// Empty payloads are not commands.
assert.equal(count([prompt('go'), call('Bash', { command: '   ' })].join('\n')), 0);

assert.match(catalog('- demo-setup — brings up the demo stack. mutates.'), /demo-setup/);
assert.equal(catalog('\n  \n'), '');
assert.match(catalog(Array.from({ length: 45 }, (_, i) => `- s${i} — does a thing.`).join('\n')), /5 more/);

console.log('ok');
