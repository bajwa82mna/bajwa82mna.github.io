import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupCrossrefIssns } from '../../src/api.js';

test('Crossref retries a journal second ISSN after a 404', async () => {
  const seen=[];
  const fetcher=async url=>{seen.push(url);return seen.length===1?{ok:false,status:404}:{ok:true,json:async()=>({message:{title:'Environmental and Experimental Botany'}})}};
  const result=await lookupCrossrefIssns(['1873-7307','0098-8472'],undefined,fetcher);
  assert.equal(result.ok,true);
  assert.match(seen[1],/0098-8472/);
});

test('Crossref 404 for every ISSN is a neutral not-listed result', async () => {
  const result=await lookupCrossrefIssns(['1873-7307','0098-8472'],undefined,async()=>({ok:false,status:404}));
  assert.deepEqual(result,{ok:true,listed:false,note:'Not listed in Crossref for this ISSN'});
});
