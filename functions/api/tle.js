// Cloudflare Pages Function: GET /api/tle
// Edge-cached proxy for the CelesTrak Starlink GP set, so readers of the live
// figure hit Cloudflare's cache instead of CelesTrak. The 2-hour TTL matches
// CelesTrak's own update cadence (they 403 faster re-downloads per IP anyway).
// On any upstream problem we return 503 and the client falls back to its own
// cache or the bundled snapshot.
const UPSTREAM = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle';
const TTL = 7200;

export async function onRequestGet({ request, waitUntil }) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/tle', request.url), { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let text = '';
  try {
    const up = await fetch(UPSTREAM, {
      headers: { 'user-agent': 'how-radar-sees.pages.dev live-constellation figure' },
    });
    text = up.ok ? await up.text() : '';
  } catch { /* network throw -> same 503 path as a bad body */ }
  if (text.length < 100_000 || !text.includes('\n1 ')) {
    return new Response('upstream TLE data unavailable\n', {
      status: 503,
      headers: { 'cache-control': 'no-store' },
    });
  }
  const res = new Response(text, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': `public, max-age=${TTL}`,
      'x-fetched-at': new Date().toISOString(),
    },
  });
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
