export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url');
  if (!url) return Response.json({ error: 'url required' }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Response.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return Response.json({ error: 'Invalid protocol' }, { status: 400 });
  }

  // Block private/local addresses
  const host = parsed.hostname;
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|::1$|0\.0\.0\.0)/.test(host)) {
    return Response.json({ error: 'Private address' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ELK/1.0; +https://hyprnova.ai)' },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return Response.json({ error: 'Fetch failed' }, { status: 502 });

    const html = await res.text();

    const getOg = (prop: string) =>
      html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1]
      ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'))?.[1]
      ?? '';

    const getMeta = (name: string) =>
      html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1]
      ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'))?.[1]
      ?? '';

    const title = getOg('title') || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '';
    const description = getOg('description') || getMeta('description') || '';
    const image = getOg('image') || '';
    const domain = parsed.hostname.replace(/^www\./, '');

    return Response.json({ title: title.slice(0, 200), description: description.slice(0, 300), image, domain, url });
  } catch {
    return Response.json({ error: 'Failed to fetch' }, { status: 502 });
  }
}
