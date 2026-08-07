import assert from 'node:assert/strict';
import test from 'node:test';
import { createQuote, completeDemoPayment } from '../docs/flow.mjs';

test('a supported YouTube request produces an MPP-shaped 402 quote bound to that URL', () => {
  const quote = createQuote('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(quote.status, 402);
  assert.match(quote.challenge, /^Payment /);
  assert.match(quote.challenge, /method="tempo"/);
  assert.match(quote.challenge, /digest="sha-256=/);
});

test('a demo payment creates a receipt and three clip results', () => {
  const quote = createQuote('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const result = completeDemoPayment(quote);
  assert.equal(result.receipt.status, 'success');
  assert.equal(result.clips.length, 3);
});
