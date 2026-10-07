const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export async function fetchJsonWithRateLimitRetry(url, fetcher = fetch, delay = wait) {
  let response = await fetcher(url, {headers: {'Accept': 'application/json'}});
  if (response.status === 429 && new URL(url).hostname === 'api.openalex.org') {
    await delay(400);
    response = await fetcher(url, {headers: {'Accept': 'application/json'}});
  }
  return response;
}
