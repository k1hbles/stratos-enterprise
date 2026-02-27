import puppeteer, { type Browser } from 'puppeteer-core';

export async function launchBrowser(): Promise<Browser> {
  // Strategy 1: @sparticuz/chromium-min (serverless / Lambda / Vercel)
  try {
    const chromium = await import('@sparticuz/chromium-min');
    const execPath = await chromium.default.executablePath();
    if (execPath) {
      console.log('[Browser] Using @sparticuz/chromium-min:', execPath);
      return puppeteer.launch({
        args: [
          ...chromium.default.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
        executablePath: execPath,
        headless: true,
      });
    }
  } catch {
    // chromium-min not available or no binary found
  }

  // Strategy 2: Puppeteer-cached Chrome (local dev — ~/.cache/puppeteer/)
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    const cacheDir = path.join(os.default.homedir(), '.cache', 'puppeteer', 'chrome');
    const entries = await fs.readdir(cacheDir).catch(() => [] as string[]);
    for (const entry of entries.sort().reverse()) {
      const candidates = [
        path.join(cacheDir, entry, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
        path.join(cacheDir, entry, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
        path.join(cacheDir, entry, 'chrome-linux64', 'chrome'),
      ];
      for (const candidate of candidates) {
        try {
          await fs.access(candidate);
          console.log('[Browser] Using Puppeteer-cached Chrome:', candidate);
          return puppeteer.launch({
            executablePath: candidate,
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
          });
        } catch { /* not this path */ }
      }
    }
  } catch { /* cache dir not found */ }

  // Strategy 3: System Chrome (macOS / Linux common paths)
  const systemPaths = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ].filter(Boolean) as string[];

  const fs = await import('fs/promises');
  for (const p of systemPaths) {
    try {
      await fs.access(p);
      console.log('[Browser] Using system Chrome:', p);
      return puppeteer.launch({
        executablePath: p,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    } catch { /* not here */ }
  }

  throw new Error(
    'No Chrome/Chromium binary found. Install puppeteer (npx puppeteer browsers install chrome), ' +
    'set CHROME_PATH env var, or install @sparticuz/chromium for serverless.'
  );
}
