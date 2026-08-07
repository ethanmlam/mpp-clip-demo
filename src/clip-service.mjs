import { createHash, randomUUID } from 'node:crypto';
import { Hono } from 'hono';

const MAX_SOURCE_SECONDS = 15 * 60;
const DEMO_PRICE_CENTS = 50;

export function createClipService({ now = () => new Date() } = {}) {
  const challenges = new Map();
  const jobs = new Map();
  const app = new Hono();

  app.post('/v1/clip', async (c) => {
    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid_json' }, 400);
    }

    const validation = validateRequest(body);
    if (validation) return c.json({ error: validation }, 400);
    const bodyText = canonicalJson(body);
    const payment = parseDemoCredential(c.req.header('authorization'));

    if (payment) {
      const challenge = challenges.get(payment.challengeId);
      if (!challenge) return c.json({ error: 'unknown_challenge' }, 402);
      if (challenge.used) return c.json({ error: 'credential_already_used' }, 409);
      if (new Date(challenge.expires) <= now()) return c.json({ error: 'challenge_expired' }, 402);
      if (challenge.bodyText !== bodyText) return c.json({ error: 'request_digest_mismatch' }, 400);

      const job = {
        job_id: `job_${randomUUID().replaceAll('-', '').slice(0, 16)}`,
        status: 'queued',
        request: body,
        created_at: now().toISOString(),
      };
      challenge.used = true;
      jobs.set(job.job_id, job);
      const receipt = Buffer.from(JSON.stringify({
        challengeId: payment.challengeId,
        method: 'tempo',
        reference: `demo_${payment.challengeId}`,
        settlement: { amount: String(DEMO_PRICE_CENTS), currency: 'pathUSD' },
        status: 'success',
        timestamp: now().toISOString(),
      })).toString('base64url');
      return c.json({
        job_id: job.job_id,
        status: job.status,
        poll_url: `/v1/jobs/${job.job_id}`,
      }, 202, {
        location: `/v1/jobs/${job.job_id}`,
        'payment-receipt': receipt,
        'cache-control': 'no-store',
      });
    }

    const digest = `sha-256=${createHash('sha256').update(bodyText).digest('base64')}`;
    const expires = new Date(now().getTime() + 5 * 60_000).toISOString();
    const challengeId = randomUUID();
    challenges.set(challengeId, { bodyText, digest, expires, used: false });

    return c.body(null, 402, {
      'www-authenticate': buildChallenge({ challengeId, digest, expires }),
      'cache-control': 'no-store',
    });
  });

  app.get('/v1/jobs/:id', (c) => {
    const job = jobs.get(c.req.param('id'));
    return job ? c.json(job) : c.json({ error: 'job_not_found' }, 404);
  });

  return {
    request: (path, init) => app.request(`http://clip.demo${path}`, init),
    completeJob(jobId, clips) {
      const job = jobs.get(jobId);
      if (!job) throw new Error(`job not found: ${jobId}`);
      job.status = 'complete';
      job.clips = clips;
      job.completed_at = now().toISOString();
      return job;
    },
    jobs,
  };
}

function validateRequest(body) {
  if (!body || typeof body !== 'object') return 'invalid_request';
  if (body.preset !== 'podcast-short' || body.max_clips !== 3) return 'unsupported_preset';
  if (typeof body.url !== 'string') return 'invalid_url';
  try {
    const url = new URL(body.url);
    const allowed = ['youtube.com', 'www.youtube.com', 'youtu.be'];
    if (url.protocol !== 'https:' || !allowed.includes(url.hostname)) return 'unsupported_video_host';
  } catch {
    return 'invalid_url';
  }
  return null;
}

function canonicalJson(value) {
  return JSON.stringify(value, Object.keys(value).sort());
}

function parseDemoCredential(header) {
  const match = /^Payment demo:([\w-]+)$/.exec(header ?? '');
  return match ? { challengeId: match[1] } : null;
}

function buildChallenge({ challengeId, digest, expires }) {
  const request = Buffer.from(JSON.stringify({
    amount: String(DEMO_PRICE_CENTS),
    currency: 'pathUSD',
    recipient: 'demo-tempo-recipient',
    max_source_seconds: MAX_SOURCE_SECONDS,
  })).toString('base64url');
  return `Payment id="${challengeId}", realm="clip.demo", method="tempo", intent="charge", expires="${expires}", digest="${digest}", request="${request}"`;
}
