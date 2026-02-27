/**
 * Isolated test for the slide renderer.
 * Run: npx tsx src/scripts/test-slides.ts
 */
import { writeFileSync } from 'fs';
import { renderSlidesToPng } from '../lib/ai/tools/renderers/html-to-slides';

const testSlides = [
  `<div style="width:1920px;height:1080px;background:linear-gradient(135deg,#1a1a2e,#16213e);
    display:flex;align-items:center;justify-content:center;flex-direction:column;">
    <h1 style="color:#e94560;font-family:Georgia;font-size:72px;margin-bottom:24px;">Test Slide 1</h1>
    <p style="color:#eee;font-family:Arial;font-size:32px;">Browser launcher is working</p>
  </div>`,
  `<div style="width:1920px;height:1080px;background:linear-gradient(135deg,#0f3460,#533483);
    display:flex;align-items:center;justify-content:center;flex-direction:column;">
    <h1 style="color:#e94560;font-family:Georgia;font-size:72px;margin-bottom:24px;">Test Slide 2</h1>
    <p style="color:#eee;font-family:Arial;font-size:32px;">PNG rendering verified</p>
  </div>`,
];

async function main() {
  console.log('Rendering 2 test slides...');
  const buffers = await renderSlidesToPng(testSlides);
  console.log(`Got ${buffers.length} PNG buffers`);

  for (let i = 0; i < buffers.length; i++) {
    const path = `/tmp/test-slide-${i + 1}.png`;
    writeFileSync(path, buffers[i]);
    console.log(`Wrote ${path} (${buffers[i].length} bytes)`);
  }

  console.log('Done! Check /tmp/test-slide-*.png');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
