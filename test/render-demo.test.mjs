import assert from 'node:assert/strict';
import { mkdtemp, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { renderDemoClips } from '../src/render-demo.mjs';

test('the local render worker creates three playable MP4 clip artifacts', async () => {
  const outputDir = await mkdtemp(join(tmpdir(), 'mpp-clip-demo-'));
  const clips = await renderDemoClips({ jobId: 'job_test123', outputDir });

  assert.equal(clips.length, 3);
  for (const clip of clips) {
    assert.match(clip.filename, /^job_test123-clip-[1-3]\.mp4$/);
    const file = await stat(join(outputDir, clip.filename));
    assert.ok(file.size > 10_000);
  }
  assert.deepEqual((await readdir(outputDir)).sort(), clips.map((clip) => clip.filename).sort());
});
