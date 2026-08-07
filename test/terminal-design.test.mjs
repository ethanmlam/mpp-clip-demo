import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../docs/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../docs/styles.css', import.meta.url), 'utf8');

test('the public demo presents the payment flow as a receipt-terminal operator surface', () => {
  assert.match(html, /CLIP PROCESSING TERMINAL/);
  assert.match(html, /MACHINE RECEIPT/);
  assert.match(html, /sandbox mode/i);
  assert.match(css, /dither/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /:focus-visible/);
});
