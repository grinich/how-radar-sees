// @ts-check
// Named-entity cards: the first mention of a satellite or operator gets an info
// card on hover/focus — a thumbnail, a one-line description, and a link to read
// more on Wikipedia. (Thumbnails are simple illustrations to avoid image-licensing
// issues; the Wikipedia link leads to real photos.)

const SAT_ICON = `<svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">
  <rect x="6" y="20" width="7" height="8" rx="1" fill="#7fb0e6"/>
  <rect x="35" y="20" width="7" height="8" rx="1" fill="#7fb0e6"/>
  <line x1="13" y1="24" x2="19" y2="24" stroke="#9aa4b2" stroke-width="1.5"/>
  <line x1="29" y1="24" x2="35" y2="24" stroke="#9aa4b2" stroke-width="1.5"/>
  <rect x="19" y="18" width="10" height="12" rx="2" fill="#e8edf4"/>
  <circle cx="24" cy="24" r="2.4" fill="#2b6cb0"/>
  <path d="M24 30 L20 40 L28 40 Z" fill="#ffcf78" opacity="0.7"/>
</svg>`;

// Institution/agency glyph for organisations (space agencies, military, offices).
const ORG_ICON = `<svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">
  <path d="M24 8 L41 16.5 L7 16.5 Z" fill="#7fb0e6"/>
  <circle cx="24" cy="13" r="1.6" fill="#2b6cb0"/>
  <rect x="7" y="17" width="34" height="2.4" rx="0.6" fill="#9aa4b2"/>
  <rect x="11.75" y="20" width="3.5" height="15" fill="#e8edf4"/>
  <rect x="18.75" y="20" width="3.5" height="15" fill="#e8edf4"/>
  <rect x="25.75" y="20" width="3.5" height="15" fill="#e8edf4"/>
  <rect x="32.75" y="20" width="3.5" height="15" fill="#e8edf4"/>
  <rect x="7" y="35" width="34" height="4" rx="1" fill="#9aa4b2"/>
</svg>`;

const ENTITIES = {
  'ICEYE': { blurb: 'Finnish company flying the largest fleet of small X-band SAR satellites (40+).', wiki: 'https://en.wikipedia.org/wiki/ICEYE' },
  'NISAR': { blurb: 'NASA–ISRO L/S-band radar satellite with a 12-metre deployable dish; launched 2025.', wiki: 'https://en.wikipedia.org/wiki/NISAR_(satellite)' },
  'Starlink': { blurb: "SpaceX's ~9,000-satellite low-Earth-orbit internet constellation.", wiki: 'https://en.wikipedia.org/wiki/Starlink' },
  'Umbra': { blurb: 'US company flying high-resolution commercial X-band SAR satellites.', wiki: 'https://en.wikipedia.org/wiki/Umbra_(company)' },
  'Maxar': { blurb: 'US operator of very-high-resolution optical imaging satellites.', wiki: 'https://en.wikipedia.org/wiki/Maxar_Technologies' },
  'AST SpaceMobile': { blurb: 'Building very large phased-array satellites for direct-to-phone service.', wiki: 'https://en.wikipedia.org/wiki/AST_SpaceMobile' },
  'Hawkeye': { blurb: 'Hawkeye 360 flies formation satellites that geolocate radio emitters.', wiki: 'https://en.wikipedia.org/wiki/HawkEye_360' },
  'GPS': { blurb: 'The US satellite navigation system — 24+ satellites in six orbital planes.', wiki: 'https://en.wikipedia.org/wiki/Global_Positioning_System' },
  'NASA': { blurb: "The United States' civilian space agency (founded 1958), running its spaceflight, aeronautics, and Earth-science missions.", wiki: 'https://en.wikipedia.org/wiki/NASA', icon: ORG_ICON },
  'ISRO': { blurb: "India's national space agency (founded 1969), known for low-cost launches and its lunar and Mars missions.", wiki: 'https://en.wikipedia.org/wiki/Indian_Space_Research_Organisation', icon: ORG_ICON },
  'NRO': { blurb: "The US agency that designs, builds, and operates the country's reconnaissance (spy) satellites.", wiki: 'https://en.wikipedia.org/wiki/National_Reconnaissance_Office', icon: ORG_ICON },
  'Space Force': { blurb: 'The space-warfare service branch of the US armed forces, established in 2019 — the newest US military service.', wiki: 'https://en.wikipedia.org/wiki/United_States_Space_Force', icon: ORG_ICON },
  'Pentagon': { blurb: 'Headquarters of the US Department of Defense, and a common metonym for the American military leadership.', wiki: 'https://en.wikipedia.org/wiki/The_Pentagon', icon: ORG_ICON },
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function makeCard(text, e) {
  const span = document.createElement('span');
  span.className = 'entity';
  span.tabIndex = 0;
  span.append(document.createTextNode(text));
  const card = document.createElement('span');
  card.className = 'entity__card';
  card.setAttribute('role', 'tooltip');
  card.innerHTML =
    `<span class="entity__thumb">${e.icon || SAT_ICON}</span>` +
    `<span class="entity__body"><b class="entity__name">${text}</b>` +
    `<span class="entity__blurb">${e.blurb}</span>` +
    `<a class="entity__link" href="${e.wiki}" target="_blank" rel="noopener">Read on Wikipedia →</a></span>`;
  span.append(card);
  return span;
}

/** Wrap the first mention of each named entity inside `root`. */
export function decorateEntities(root) {
  const names = Object.keys(ENTITIES).sort((a, b) => b.length - a.length);
  const remaining = new Set(names);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentElement;
      if (!p || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (p.closest('figure, figcaption, h1, h2, h3, .gloss, .entity, code, .toc, .part-divider, summary, a')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);

  for (const tn of nodes) {
    if (!remaining.size) break;
    for (const name of names) {
      if (!remaining.has(name)) continue;
      const re = new RegExp('\\b' + escapeRe(name) + '\\b');
      const m = tn.nodeValue.match(re);
      if (!m) continue;
      const idx = m.index;
      const before = tn.nodeValue.slice(0, idx);
      const matched = tn.nodeValue.slice(idx, idx + name.length);
      const after = tn.nodeValue.slice(idx + name.length);
      const parent = tn.parentNode;
      parent.insertBefore(document.createTextNode(before), tn);
      parent.insertBefore(makeCard(matched, ENTITIES[name]), tn);
      tn.nodeValue = after;
      remaining.delete(name);
    }
  }
}
