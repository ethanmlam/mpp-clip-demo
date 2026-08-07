const DEMO_AMOUNT = '50';

export function createQuote(url) {
  const parsed = new URL(url);
  const allowed = new Set(['youtube.com', 'www.youtube.com', 'youtu.be']);
  if (parsed.protocol !== 'https:' || !allowed.has(parsed.hostname)) {
    throw new Error('Use a public YouTube URL for this demo.');
  }
  const id = cryptoId();
  const request = JSON.stringify({ url: parsed.toString(), preset: 'podcast-short', max_clips: 3 });
  const digest = `sha-256=${toBase64(request).slice(0, 32)}`;
  const expires = new Date(Date.now() + 5 * 60_000).toISOString();
  const paymentRequest = toBase64(JSON.stringify({ amount: DEMO_AMOUNT, currency: 'pathUSD', recipient: 'demo-tempo-recipient' }));
  return {
    id,
    status: 402,
    amount: '$0.50 demo credit',
    expires,
    challenge: `Payment id="${id}", realm="clip.demo", method="tempo", intent="charge", expires="${expires}", digest="${digest}", request="${paymentRequest}"`,
  };
}

export function completeDemoPayment(quote) {
  return {
    receipt: {
      challengeId: quote.id,
      method: 'tempo',
      reference: `demo_${quote.id}`,
      settlement: { amount: DEMO_AMOUNT, currency: 'pathUSD' },
      status: 'success',
      timestamp: new Date().toISOString(),
    },
    clips: [
      { title: 'The contrarian insight', file: 'clips/clip-1.mp4', duration: '0:46' },
      { title: 'The tactical takeaway', file: 'clips/clip-2.mp4', duration: '0:48' },
      { title: 'The closer', file: 'clips/clip-3.mp4', duration: '0:47' },
    ],
  };
}

function toBase64(value) {
  if (typeof Buffer !== 'undefined') return Buffer.from(value).toString('base64url');
  return btoa(value).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function cryptoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `ch_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}
