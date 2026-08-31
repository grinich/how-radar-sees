// Refresh the committed Starlink TLE snapshot in public/data/. The live figure
// only falls back to this file when CelesTrak (and its edge cache) is
// unreachable, so it just needs to be occasionally refreshed: `npm run fetch:tle`.
// CelesTrak 403s repeat downloads of a group from the same IP inside its 2-hour
// update window, hence the supplemental endpoint as a second try.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data');

const SOURCES = [
  { name: 'celestrak-gp', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle' },
  { name: 'celestrak-supplemental', url: 'https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?SOURCE=SpaceX-E&FORMAT=tle' },
];

function looksLikeTle(text) {
  return text.length > 100_000 && text.includes('\n1 ') && text.includes('\n2 ');
}

for (const src of SOURCES) {
  const res = await fetch(src.url);
  const text = res.ok ? await res.text() : '';
  if (!looksLikeTle(text)) {
    console.warn(`${src.name}: unusable (${res.status} ${text.slice(0, 80).replace(/\n/g, ' ')})`);
    continue;
  }
  const count = (text.match(/^1 /gm) || []).length;
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'starlink-snapshot.tle'), text);
  writeFileSync(join(OUT_DIR, 'starlink-snapshot.json'),
    JSON.stringify({ fetchedAt: new Date().toISOString(), source: src.name, count }, null, 2) + '\n');
  console.log(`wrote ${count} satellites from ${src.name}`);
  process.exit(0);
}
console.error('all sources failed; snapshot not updated');
process.exit(1);
