import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import{intervals,summarize}from'../src/summary.js';
const works=JSON.parse(fs.readFileSync(new URL('../build/fixtures/works.json',import.meta.url))).message.items;
const expected=JSON.parse(fs.readFileSync(new URL('../build/fixtures/summary-golden.json',import.meta.url)));
test('browser summary exactly matches Python golden fixture',()=>{assert.deepEqual(summarize(works),expected);assert.deepEqual(intervals(works[0])[0],{sa:30,ao:20,so:50,year:2024});});
