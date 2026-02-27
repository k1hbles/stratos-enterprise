import { launchBrowser } from './browser';

export async function renderSlidesToPng(htmlSlides: string[]): Promise<Buffer[]> {
  if (htmlSlides.length === 0) {
    console.warn('[Slides] No slides to render');
    return [];
  }

  // Validate HTML — replace empty/malformed slides with fallback
  for (let i = 0; i < htmlSlides.length; i++) {
    const html = htmlSlides[i];
    if (!html || html.trim().length < 50) {
      console.warn(`[Slides] Slide ${i + 1} has empty/invalid HTML (${html?.length ?? 0} chars), using fallback`);
      htmlSlides[i] = `<div style="width:1920px;height:1080px;background:#0A0F1E;
        display:flex;align-items:center;justify-content:center;">
        <div style="color:#FFFFFF;font-family:Georgia;font-size:48px;">Slide ${i + 1}</div>
      </div>`;
    }
  }

  console.log('[Slides] Launching browser...');
  const browser = await launchBrowser();
  console.log('[Slides] Browser launched, rendering', htmlSlides.length, 'slides');

  try {
    const buffers: Buffer[] = [];
    for (let i = 0; i < htmlSlides.length; i++) {
      console.log(`[Slides] Rendering slide ${i + 1}/${htmlSlides.length}...`);
      const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1920px; height: 1080px; overflow: hidden; background: #0A0F1E; }</style>
</head><body>${htmlSlides[i]}</body></html>`;

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
      await page.setContent(fullHtml, { waitUntil: "networkidle0", timeout: 30000 });
      const screenshot = await page.screenshot({
        type: "png",
        clip: { x: 0, y: 0, width: 1920, height: 1080 },
      });
      const buf = Buffer.from(screenshot);
      console.log(`[Slides] Slide ${i + 1} captured, size: ${buf.length} bytes`);
      buffers.push(buf);
      await page.close();
    }
    console.log('[Slides] All slides rendered, closing browser');
    return buffers;
  } finally {
    await browser.close();
  }
}
