import test from 'node:test'; import assert from 'node:assert/strict';
import { normalizeIssn, isValidIssn, extractIssns } from '../../src/issn.js';
test('normalizes and validates ISSNs including X',()=>{assert.equal(normalizeIssn('ISSN 00320889'),'0032-0889');assert.equal(isValidIssn('0032-0889'),true);assert.equal(isValidIssn('2434-561X'),true);assert.equal(isValidIssn('0032-0888'),false)});
test('extracts distinct print and electronic ISSNs',()=>assert.deepEqual(extractIssns('0032-0889 / 1532-2548 and 00320889'),['0032-0889','1532-2548']));
