#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

const limit = 20 * 1024 * 1024;
const output = execFileSync('git', [
  'ls-files',
  '--cached',
  '--others',
  '--exclude-standard',
  '-z',
], { encoding: 'utf8' });
const oversized = output.split('\0').filter(Boolean).filter(file => statSync(file).size > limit);

if (oversized.length) {
  console.error(`Files larger than 20 MiB are committable:\n${oversized.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('OK: no committable file exceeds 20 MiB.');
}
