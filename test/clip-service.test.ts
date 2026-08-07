import assert from 'node:assert/strict';
import test from 'node:test';
import { createClipService } from '../src/clip-service.ts';

test('an unpaid valid clip request receives an MPP payment challenge bound to the request', async () => {
  const service = createClipService({ now: () => new Date('2026-08-07T00:00:00Z') });
  const body = {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    preset: 'podcast-short',
    max_clips: 3,
  };

  const response = await service.request('/v1/clip', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  assert.equal(response.status, 402);
  const challenge = response.headers.get('www-authenticate') ?? '';
  assert.match(challenge, /^Payment /);
  assert.match(challenge, /method="tempo"/);
  assert.match(challenge, /intent="charge"/);
  assert.match(challenge, /digest="sha-256=/);
});
