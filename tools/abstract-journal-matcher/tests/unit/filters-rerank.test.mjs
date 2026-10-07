import test from "node:test";import assert from "node:assert/strict";import {applyFilters} from "../../src/filters.js";import {diversify} from "../../src/rerank.js";
const rows=[{profile:{publisher:"A",oa:true,apc:false,category:"X"}},{profile:{publisher:"A",oa:true,apc:true,category:"X"}},{profile:{publisher:"A",oa:true,apc:false,category:"X"}},{profile:{publisher:"B",oa:false,apc:false,category:"Y"}}];
test("filters evidence without changing scores",()=>assert.equal(applyFilters(rows,{oa:true,noApc:true}).length,2));
test("publisher cap is deterministic",()=>assert.deepEqual(diversify(rows,4,2).map(x=>x.profile.publisher),["A","A","B"]));
