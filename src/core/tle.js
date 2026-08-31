// @ts-check
// Loads the current Starlink TLE set for the live-constellation figure, trying
// (in order): a fresh localStorage copy, our edge-cached /api/tle proxy, CelesTrak
// directly (they send CORS headers, but 403 repeat downloads per IP inside their
// 2-hour update window — hence the proxy), a stale localStorage copy, and finally
// the snapshot bundled with the site. Something always loads.

const KEY = 'hrs:tle:v1';
const FRESH_MS = 2 * 3600 * 1000; // CelesTrak updates the GP set every 2 hours
const DIRECT_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle';

const MIN_RECORDS = 500; // a real Starlink GP set has thousands of "1 ..." lines
const MAX_CACHE_CHARS = 4_000_000; // won't fit typical 5 MB quotas once JSON-wrapped

function looksLikeTle(text) {
  if (typeof text !== 'string' || text.length < 100_000 || !text.includes('\n2 ')) return false;
  // Require a real record count so a truncated cache or a captive-portal page
  // that happens to contain '\n1 ' can't produce a near-empty globe.
  let n = 0;
  for (let i = text.indexOf('\n1 '); i !== -1 && n < MIN_RECORDS; i = text.indexOf('\n1 ', i + 1)) n++;
  return n >= MIN_RECORDS;
}

function readCache() {
  let cached = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (looksLikeTle(c.text)) cached = c;
  } catch { /* corrupt entry: fall through to eviction */ }
  if (!cached) {
    try { localStorage.removeItem(KEY); } catch { /* private mode */ }
  }
  return cached;
}

function writeCache(text, fetchedAt) {
  if (text.length > MAX_CACHE_CHARS) return;
  try { localStorage.setItem(KEY, JSON.stringify({ fetchedAt, text })); } catch { /* quota/private mode */ }
}

async function tryFetch(url) {
  try {
    // Bound each tier so a slow upstream can't hold the figure at "loading";
    // the bundled snapshot at the end of the chain is instant.
    const res = await fetch(url, { signal: AbortSignal.timeout?.(8000) });
    if (!res.ok) return null;
    const text = await res.text();
    return looksLikeTle(text) ? text : null;
  } catch { return null; }
}

/**
 * @returns {Promise<{text: string, source: 'live'|'cache'|'stale'|'snapshot', fetchedAt: number}>}
 */
export async function loadTle() {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < FRESH_MS) {
    return { text: cached.text, source: 'cache', fetchedAt: cached.fetchedAt };
  }
  for (const url of ['api/tle', DIRECT_URL]) {
    const text = await tryFetch(url);
    if (text) {
      const fetchedAt = Date.now();
      writeCache(text, fetchedAt);
      return { text, source: 'live', fetchedAt };
    }
  }
  if (cached) return { text: cached.text, source: 'stale', fetchedAt: cached.fetchedAt };
  const text = await tryFetch('data/starlink-snapshot.tle');
  if (text) {
    let fetchedAt = 0;
    try {
      const meta = await (await fetch('data/starlink-snapshot.json')).json();
      fetchedAt = Date.parse(meta.fetchedAt) || 0;
    } catch { /* meta is cosmetic */ }
    return { text, source: 'snapshot', fetchedAt };
  }
  throw new Error('no TLE source available');
}
