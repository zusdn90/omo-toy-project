import test from 'node:test';
import assert from 'node:assert/strict';

import { neighborhoods } from '../src/domain';
import { createKakaoNeighborhoodLoader } from '../src/kakao-local';

test('kakao loader retries after a transient failure and caches only successful snapshots', async () => {
  const neighborhood = neighborhoods[0];
  const calls: string[] = [];
  let failOnce = true;

  const fetchImpl = async (input: string | URL | Request) => {
    calls.push(String(input));

    if (failOnce) {
      failOnce = false;
      throw new Error('transient kakao outage');
    }

    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      async json() {
        return {
          documents: [
            {
              id: 'place-1',
              place_name: '실제 장소',
              category_group_name: '한식',
              x: '127.0558',
              y: '37.5442'
            }
          ]
        };
      }
    } as Response;
  };

  const loader = createKakaoNeighborhoodLoader({ apiKey: 'test-rest-key', fetchImpl });

  const first = await loader.loadNeighborhoodSnapshot(neighborhood);
  const second = await loader.loadNeighborhoodSnapshot(neighborhood);
  const third = await loader.loadNeighborhoodSnapshot(neighborhood);

  assert.equal(first, null);
  assert(second);
  assert.equal(second?.view.ranked.length, 1);
  assert.equal(calls.length, 2);
  assert.equal(third?.view.ranked.length, 1);
  assert.equal(calls.length, 2, 'successful snapshot should be cached after retry');
});
