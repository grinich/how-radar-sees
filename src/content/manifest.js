// @ts-check
// Single source of truth for the essay's section order. Consumed by the
// build-time prose inliner in vite.config.js, which renders every partial
// straight into index.html — so crawlers, reader mode, archive tools, and
// no-JS readers all get the full text without executing a line of JS.
// A string is a partial in this directory; a [n, title] pair is a part divider.

export const SECTIONS = [
  '00-intro.html',
  '00b-starlink.html',
  [1, 'Seeing with Echoes'],
  '01-echo.html',
  '02-resolution.html',
  '03-snr.html',
  '04-validation.html',
  [2, 'Building a Picture'],
  'ch2-01-onepixel.html',
  'ch2-02-aperture.html',
  'ch2-03-rangedoppler.html',
  'ch2-04-artifacts.html',
  'ch2-05-backprojection.html',
  [3, 'Tracking Motion'],
  'ch3-01-dilemma.html',
  'ch3-02-scan.html',
  'ch3-03-interferometry.html',
  'ch3-03b-insar.html',
  'ch3-04-crt.html',
  'ch3-05-stap.html',
  'ch3-06-distributed.html',
  'ch3-07-sigint.html',
  [4, 'How Starlink Talks'],
  'ch4-01-modulation.html',
  'ch4-02-fourier.html',
  'ch4-03-access.html',
  'ch4-04-phasedarray.html',
  'ch4-05-amplifiers.html',
  'ch4-06-antennas.html',
  [5, 'Is Starlink a Secret Radar?'],
  'ch5-00-intro.html',
  '07-duplexing.html',
  '08-sweep.html',
  '09-dtc.html',
  '10-coverage.html',
  '11-implications.html',
];

export const partHtml = (n, title) =>
  `<h1 class="part-divider" id="part-${n}"><span class="part-divider__num">Part ${n}</span>${title}</h1>`;
