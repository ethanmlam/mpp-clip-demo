import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createClipService } from './clip-service.mjs';
import { renderDemoClips } from './render-demo.mjs';

const outputDir = join(process.cwd(), 'artifacts', 'demo-run');
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const service = createClipService();
const request = {
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  preset: 'podcast-short',
  max_clips: 3,
};
const body = JSON.stringify(request);
const quote = await service.request('/v1/clip', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body,
});
const challenge = quote.headers.get('www-authenticate');
const challengeId = /id="([^"]+)"/.exec(challenge)?.[1];
if (quote.status !== 402 || !challengeId) throw new Error('Expected an MPP payment challenge');

const paid = await service.request('/v1/clip', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Payment demo:${challengeId}`,
  },
  body,
});
if (paid.status !== 202) throw new Error(`Payment retry failed: ${paid.status}`);
const job = await paid.json();
const clips = await renderDemoClips({ jobId: job.job_id, outputDir });
service.completeJob(job.job_id, clips);
const completed = await (await service.request(`/v1/jobs/${job.job_id}`)).json();

console.log(JSON.stringify({
  payment_flow: '402 challenge -> demo Tempo credential -> receipt',
  challenge_id: challengeId,
  receipt: paid.headers.get('payment-receipt'),
  job: completed,
  artifacts_directory: outputDir,
}, null, 2));
