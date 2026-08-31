// @ts-check
// Lightweight glossary: the first mention of each term gets a small info icon that
// reveals a definition on hover or focus. Terms are matched in the prose text so
// the content stays clean.

const GLOSSARY = {
  'SAR': "Synthetic aperture radar — using a moving antenna's flight path as one huge virtual antenna to form sharp images.",
  'SNR': "Signal-to-noise ratio — how far the echo rises above the receiver's noise; the number that decides image quality.",
  'PRF': 'Pulse repetition frequency — how many pulses per second the radar transmits.',
  'STAP': 'Space-time adaptive processing — filtering across antennas and pulses together to null clutter and reveal movers.',
  'GPU': 'Graphics processing unit — a massively parallel processor, here running the imaging maths for every pixel at once.',
  'OFDM': 'Orthogonal frequency-division multiplexing — splitting a signal into many narrow sub-carriers at once. The standard for 4G/5G, Wi-Fi, and Starlink.',
  'QAM': 'Quadrature amplitude modulation — packing bits into both the amplitude and the phase of the carrier. 256-QAM carries 8 bits per symbol.',
  'PAPR': 'Peak-to-average power ratio — how spiky a waveform is. High PAPR forces the amplifier to back off and waste power.',
  'chirp': 'A pulse whose frequency sweeps steadily. Compressing it against a matched filter lifts a faint echo out of the noise.',
  'Doppler': 'The frequency shift an echo picks up from relative motion — higher when closing, lower when receding.',
  'NESZ': 'Noise-equivalent sigma-zero — the faintest surface a radar can still detect. Its sensitivity floor, in decibels.',
  'sigma-zero': 'Radar reflectivity per unit area — how bright a patch of ground looks to the radar.',
  'phased array': 'An antenna of many small elements whose relative phases steer the beam electronically, with no moving parts.',
  'DPCA': 'Displaced phase-centre antenna — subtracting two looks spaced by one pulse of travel, cancelling stationary clutter.',
  'matched filter': 'Correlating a received echo against the exact transmitted waveform, concentrating its energy and suppressing noise.',
  'grazing angle': 'The angle between the ground and the line up to the satellite. SAR works between roughly 30° and 60°.',
  'slant range': 'The straight-line distance from the radar to the target.',
  'bistatic': 'A radar whose transmitter and receiver sit in different places — for example, on two different satellites.',
  'low-noise amplifier': 'The first, ultra-quiet amplifier in a receiver, which boosts an impossibly faint signal before anything else.',
  'spread spectrum': 'Smearing a signal across a wide band with a code, so it can be received even below the noise floor — how GPS works.',
  'grating lobe': 'A false second beam that appears when array elements are spaced too far apart in wavelengths.',
  'space-division multiple access': 'Reusing the same frequencies in separate beams pointed at different places — the trick that lets Starlink scale.',
  'decibel': 'A ratio on a logarithmic scale: 3 dB ≈ 2×, 10 dB = 10×, 20 dB = 100×. Negative values are fractions.',
  'speckle': 'The salt-and-pepper grain of every raw SAR image, from echoes within one pixel adding with random phases.',
  'stripmap': 'The default SAR mode: the antenna stares sideways at a fixed angle while the strip of ground scrolls past.',
  'spotlight': 'A SAR mode that steers the beam to stare at one spot, stretching the dwell for finer azimuth resolution at the cost of coverage.',
  'pulse compression': 'Transmitting a long frequency-swept pulse and collapsing its echo with a matched filter — the energy of a long pulse, the sharpness of a short one.',
  'duty cycle': 'The fraction of time a transmitter is actually transmitting.',
  'noise figure': "How much noise a receiver's own electronics add on top of the unavoidable thermal floor.",
  'fractional bandwidth': "A signal's bandwidth as a share of its carrier frequency — the number that decides how badly a phased array squints.",
  'true time delay': 'Delaying each element by actual time rather than phase — frequency-flat, so wideband signals steer without squint.',
  'forward error correction': 'Spending a fraction of the bits on redundancy so the receiver can repair errors instead of resending.',
  'minimum detectable velocity': 'The slowest radial motion whose phase signature still rises above the noise — the floor for spotting slow movers.',
  'Starshield': "SpaceX's classified satellite line for the US National Reconnaissance Office, flown on Starlink-derived buses.",
  'ambiguity function': 'A radar response spread over delay and Doppler — the one picture that ties range resolution, velocity resolution, and the PRF dilemma together.',
  'polarimetry': 'Transmitting and receiving on more than one polarization to read how a surface scattered — its material — not just how bright it is.',
  'revisit': 'How long a given place on the ground waits between satellite passes close enough to image it.',
  'coherence': 'How well the fine speckle of two radar looks still matches — high where nothing changed, collapsing where the ground was disturbed.',
  'alias': 'Aliasing — when a signal is sampled too slowly, fast variations masquerade as slower ones; a fast target can read as slow, or the scene ghosts.',
  'clutter': 'The strong radar echo from the stationary background — ground, sea, buildings — that a moving target must be picked out from.',
  'swath': 'The strip of ground a radar images in a single pass.',
  'squint': 'How far the radar beam is angled forward or back from pointing straight out to the side.',
  'interferometry': "Comparing the phase of two antennas' returns to measure tiny differences — a target's motion, or the height of terrain.",
  'baseline': 'The distance between two antennas (or two satellites); longer baselines resolve finer motion or height.',
  'coherent': 'Preserving the exact phase of the wave — essential for focusing a SAR image and for interferometry.',
  'boresight': 'The direction an antenna points straight ahead, before any electronic steering.',
  'nadir': 'The point on the ground straight down beneath the satellite.',
  'circulator': 'A device that routes the transmit signal out to the antenna and the incoming echo to the receiver, keeping the two apart.',
  'processing gain': 'The boost in signal-to-noise a radar earns by compressing its pulse and coherently combining many of them.',
  'thermal noise': 'The unavoidable electrical noise from heat in the receiver — the noise floor the echo has to beat.',
  'blind speed': 'A target velocity whose measured phase happens to wrap to zero, making it invisible to a single-baseline detector.',
  'custodial': 'Custodial tracking — keeping a continuous radar eye on one target, frame after frame, once it has been found.',
  'phase centre': 'The effective point from which an antenna transmits or receives — its optical centre.',
  'nulling': "Shaping an array's pattern to put a blind spot (a null) in a chosen direction, to reject a jammer or clutter.",
};

import { attachPopClamp } from './popclamp.js';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let popSeq = 0;
/** @type {HTMLElement | null} the term whose definition is currently pinned open */
let openGloss = null;

/** Pin a term's definition open (or close it); at most one is open at a time. */
function setOpen(span, open) {
  if (open && openGloss && openGloss !== span) setOpen(openGloss, false);
  span.classList.toggle('is-open', open);
  span.setAttribute('aria-expanded', String(open));
  openGloss = open ? span : (openGloss === span ? null : openGloss);
}

function makeGloss(text, def) {
  const span = document.createElement('span');
  span.className = 'gloss';
  span.tabIndex = 0;
  span.setAttribute('role', 'button');
  span.setAttribute('aria-label', text);
  span.setAttribute('aria-expanded', 'false');
  span.append(document.createTextNode(text));
  const icon = document.createElement('sup');
  icon.className = 'gloss__i';
  icon.textContent = 'i';
  icon.setAttribute('aria-hidden', 'true');
  const pop = document.createElement('span');
  pop.className = 'gloss__pop';
  pop.id = `gloss-pop-${++popSeq}`;
  pop.setAttribute('role', 'tooltip');
  pop.textContent = def;
  span.setAttribute('aria-describedby', pop.id);
  span.append(icon, pop);
  attachPopClamp(span, pop);

  span.addEventListener('click', (e) => {
    // Clicks inside the popup (e.g. selecting text) shouldn't toggle it.
    if (/** @type {HTMLElement} */ (e.target).closest('.gloss__pop')) return;
    setOpen(span, !span.classList.contains('is-open'));
  });
  span.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(span, !span.classList.contains('is-open'));
    } else if (e.key === 'Escape') {
      setOpen(span, false);
    }
  });
  return span;
}

/** Close a pinned-open definition when the reader taps/clicks elsewhere. */
let outsideCloseBound = false;
function bindOutsideClose() {
  if (outsideCloseBound) return;
  outsideCloseBound = true;
  document.addEventListener('pointerdown', (e) => {
    if (openGloss && !openGloss.contains(/** @type {Node} */ (e.target))) setOpen(openGloss, false);
  });
}

/** Wrap the first mention of each glossary term inside `root`. */
export function decorateGlossary(root) {
  bindOutsideClose();
  const terms = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length); // longest first
  const remaining = new Set(terms);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentElement;
      if (!p || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (p.closest('figure, figcaption, h1, h2, h3, .gloss, code, .toc, .part-divider, summary, .eq')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);

  for (const tn of nodes) {
    if (!remaining.size) break;
    for (const term of terms) {
      if (!remaining.has(term)) continue;
      // Also match simple plurals and adverbs ("grating lobes", "coherently").
      const re = new RegExp('\\b' + escapeRe(term) + '(?:s|ly)?\\b', 'i');
      const m = tn.nodeValue.match(re);
      if (!m) continue;
      const idx = m.index;
      const before = tn.nodeValue.slice(0, idx);
      const matched = m[0];
      const after = tn.nodeValue.slice(idx + m[0].length);
      const parent = tn.parentNode;
      parent.insertBefore(document.createTextNode(before), tn);
      parent.insertBefore(makeGloss(matched, GLOSSARY[term]), tn);
      tn.nodeValue = after; // keep scanning the tail for other terms
      remaining.delete(term);
    }
  }
}
