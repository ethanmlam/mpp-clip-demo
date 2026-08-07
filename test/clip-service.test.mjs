import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClipService } from '../src/clip-service.mjs';
import { renderDemoClips } from '../src/render-demo.mjs';

function responseJson(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

const requestBody = {
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  preset: 'podcast-short',
  max_clips: 3,
};

async function createPaidJob(service) {
  const body = JSON.stringify(requestBody);
  const first = await service.request('/v1/clip', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body,
  });
  const challengeId = /id="([^"]+)"/.exec(first.headers.get('www-authenticate'))?.[1];
  assert.ok(challengeId);
  const paid = await service.request('/v1/clip', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Payment demo:${challengeId}` },
    body,
  });
  return { paid, challengeId, job: await paid.json() };
}

test('an unpaid valid clip request receives an MPP payment challenge bound to the request', async () => {
  const service = createClipService({ now: () => new Date('2026-08-07T00:00:00Z') });
  const response = await service.request('/v1/clip', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(requestBody),
  });

  assert.equal(response.status, 402);
  const challenge = response.headers.get('www-authenticate') ?? '';
  assert.match(challenge, /^Payment /);
  assert.match(challenge, /method="tempo"/);
  assert.match(challenge, /intent="charge"/);
  assert.match(challenge, /digest="sha-256=/);
});

test('a valid demo payment credential creates exactly one queued job and returns an MPP receipt', async () => {
  const service = createClipService({ now: () => new Date('2026-08-07T00:00:00Z') });
  const { paid, challengeId, job } = await createPaidJob(service);
  assert.equal(paid.status, 202);
  assert.equal(responseJson(paid.headers.get('payment-receipt')).challengeId, challengeId);
  assert.equal(job.status, 'queued');
  assert.match(job.job_id, /^job_/);

  const replay = await service.request('/v1/clip', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Payment demo:${challengeId}` },
    body: JSON.stringify(requestBody),
  });
  assert.equal(replay.status, 409);
});

test('a completed render is returned by the paid job status endpoint', async () => {
  const service = createClipService({ now: () => new Date('2026-08-07T00:00:00Z') });
  const { job } = await createPaidJob(service);
  const outputDir = await mkdtemp(join(tmpdir(), 'mpp-clip-api-'));
  const clips = await renderDemoClips({ jobId: job.job_id, outputDir });

  service.completeJob(job.job_id, clips);
  const result = await service.request(`/v1/jobs/${job.job_id}`);
  assert.equal(result.status, 200);
  const completed = await result.json();
  assert.equal(completed.status, 'complete');
  assert.equal(completed.clips.length, 3);
});
