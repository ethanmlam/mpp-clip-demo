import { completeDemoPayment, createQuote } from './flow.mjs';

const url = document.querySelector('#url');
const quoteButton = document.querySelector('#quote');
const flow = document.querySelector('#flow');
const template = document.querySelector('#challenge-template');

quoteButton.addEventListener('click', () => {
  try {
    const quote = createQuote(url.value.trim());
    flow.replaceChildren(template.content.cloneNode(true));
    flow.classList.remove('hidden');
    flow.querySelector('#challenge').textContent = quote.challenge;
    flow.querySelector('#pay').addEventListener('click', () => showPaidResult(quote));
  } catch (error) {
    flow.classList.remove('hidden');
    flow.textContent = error.message;
  }
});

function showPaidResult(quote) {
  const result = completeDemoPayment(quote);
  flow.innerHTML = `
    <article class="step"><div class="step-number">2</div><div><p class="eyebrow">PAYMENT RETRY</p><h2>202 Accepted</h2><p>Demo credential accepted. A real agent would retry with <code>Authorization: Payment &lt;credential&gt;</code>.</p><pre>${JSON.stringify(result.receipt, null, 2)}</pre></div></article>
    <article class="step"><div class="step-number">3</div><div><p class="eyebrow">RENDER COMPLETE</p><h2>Three clips, ready to collect.</h2><div class="clips">${result.clips.map((clip) => `<a class="clip" href="${clip.file}" target="_blank"><span class="play">▶</span><span><strong>${clip.title}</strong><small>${clip.duration} vertical clip</small></span></a>`).join('')}</div></div></article>`;
}
