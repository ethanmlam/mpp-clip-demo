import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const CLIP_TITLES = [
  'The contrarian insight',
  'The tactical takeaway',
  'The closer',
];

export async function renderDemoClips({ jobId, outputDir }) {
  await mkdir(outputDir, { recursive: true });
  const clips = [];
  for (let index = 0; index < CLIP_TITLES.length; index += 1) {
    const filename = `${jobId}-clip-${index + 1}.mp4`;
    const outputPath = join(outputDir, filename);
    await runFfmpeg(outputPath, index);
    clips.push({
      filename,
      title: CLIP_TITLES[index],
      start_s: 0,
      end_s: 2,
      mp4_url: `/artifacts/${filename}`,
    });
  }
  return clips;
}

function runFfmpeg(outputPath, index) {
  const colors = ['0x3428a8', '0x0f766e', '0x9f1239'];
  return new Promise((resolve, reject) => {
    const args = [
      '-y', '-f', 'lavfi', '-i', `color=c=${colors[index]}:s=720x1280:r=30`,
      '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100',
      '-t', '2', '-shortest',
      '-vf', 'drawbox=x=60:y=520:w=600:h=240:color=white@0.16:t=fill,drawbox=x=60:y=520:w=600:h=240:color=white@0.8:t=4',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', outputPath,
    ];
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr}`)));
  });
}
