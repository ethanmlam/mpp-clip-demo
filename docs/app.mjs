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
    flow.innerHTML = `<article class="receipt"><div class="receipt-meta"><span>TERMINAL ERROR</span><span>INPUT REJECTED</span></div><div class="receipt-body"><div><p class="kicker">ACTION REQUIRED</p><h2>Use a public YouTube link.</h2><p>${escapeHtml(error.message)}</p></div><p class="processing">Fix the source URL, then issue a new challenge.</p></div></article>`;
  }
});

function showPaidResult(quote) {
  const result = completeDemoPayment(quote);
  flow.innerHTML = `
    <article class="receipt receipt-success">
      <div class="receipt-meta"><span>RECEIPT 202 / JOB ACCEPTED</span><span>PAYMENT VERIFIED</span></div>
      <div class="receipt-body">
        <div><p class="kicker">SETTLEMENT RECEIPT</p><h2>Job is in the queue.</h2><p>This sandbox receipt mirrors the response an agent gets after its payment credential verifies.</p></div>
        <pre>${escapeHtml(JSON.stringify(result.receipt, null, 2))}</pre>
      </div>
      <div class="receipt-action"><span>STATUS: COMPLETE / TEST OUTPUTS ATTACHED</span><span class="processing">3 CLIPS RENDERED</span></div>
    </article>
    <section class="clips" aria-label="Rendered test clips">${result.clips.map((clip) => `<a class="clip" href="${clip.file}" target="_blank" rel="noopener"><span><span class="play" aria-hidden="true">▶</span><strong>${escapeHtml(clip.title)}</strong><small>${clip.duration} / 9:16 test render</small></span></a>`).join('')}</section>`;
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
