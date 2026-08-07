# MPP Clip Demo

A runnable MPP-shaped clipping demo: an agent submits a YouTube URL, receives a Tempo payment challenge, retries with a demo payment credential, and gets three rendered MP4 clip artifacts.

## Run it

```bash
pnpm install
pnpm test
pnpm demo
```

`pnpm demo` writes three vertical MP4 artifacts under `artifacts/demo-run/` and prints the challenge ID, payment receipt, job record, and artifact URLs.

## What is real now

- HTTP payment lifecycle: MPP-style `402` Challenge → `Authorization: Payment` retry → `Payment-Receipt`
- Request digest binding, expiry, and one-time credential enforcement
- Actual FFmpeg H.264/AAC vertical MP4 artifacts
- A working paid-job lifecycle, including result polling

## Intentional demo boundary

The `Payment demo:<challenge-id>` credential is a **local payment verifier**, not a real Tempo transaction. It makes the entire API and worker flow runnable with zero secrets. Replace it with `mppx` Tempo verification plus Stripe/Tempo credentials to move to a live payment demo.

The worker emits synthetic vertical clips today. The production seam is clear: replace `renderDemoClips` with download → Whisper timestamps → clip scoring → FFmpeg captions/reframe.
