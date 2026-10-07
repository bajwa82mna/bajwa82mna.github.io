import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchJsonWithRateLimitRetry } from '../../src/fetch.js';

test('OpenAlex 429 is retried once after a short delay', async () => {
  let calls = 0, delays = 0;
  const fetcher = async () => ++calls === 1 ? {ok:false,status:429,statusText:'Too Many Requests'} : {ok:true,status:200,json:async()=>({results:[{id:'S1'}]})};
  const response = await fetchJsonWithRateLimitRetry('https://api.openalex.org/sources', fetcher, async () => { delays += 1; });
  assert.equal(calls, 2); assert.equal(delays, 1); assert.deepEqual(await response.json(), {results:[{id:'S1'}]});
});
test('non-OpenAlex responses are not retried', async () => {
  let calls = 0;
  await fetchJsonWithRateLimitRetry('https://doaj.org/api/search', async () => { calls += 1; return {ok:false,status:429}; }, async () => {});
  assert.equal(calls, 1);
});
