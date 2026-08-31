// @ts-check
// The whole essay as one long page (Ciechanowski-style), with part dividers and a
// long table of contents on the right.
import { bootPage } from '../core/page.js';

import intro from '../content/00-intro.html?raw';
import introStarlink from '../content/00b-starlink.html?raw';
import p1a from '../content/01-echo.html?raw';
import p1b from '../content/02-resolution.html?raw';
import p1c from '../content/03-snr.html?raw';
import p1d from '../content/04-validation.html?raw';

import p2a from '../content/ch2-01-onepixel.html?raw';
import p2b from '../content/ch2-02-aperture.html?raw';
import p2c from '../content/ch2-03-rangedoppler.html?raw';
import p2d from '../content/ch2-04-artifacts.html?raw';
import p2e from '../content/ch2-05-backprojection.html?raw';

import p3a from '../content/ch3-01-dilemma.html?raw';
import p3b from '../content/ch3-02-scan.html?raw';
import p3c from '../content/ch3-03-interferometry.html?raw';
import p3d from '../content/ch3-04-crt.html?raw';
import p3e from '../content/ch3-05-stap.html?raw';
import p3f from '../content/ch3-06-distributed.html?raw';
import p3g from '../content/ch3-07-sigint.html?raw';

import p4a from '../content/ch4-01-modulation.html?raw';
import p4b from '../content/ch4-02-fourier.html?raw';
import p4c from '../content/ch4-03-access.html?raw';
import p4d from '../content/ch4-04-phasedarray.html?raw';
import p4e from '../content/ch4-05-amplifiers.html?raw';

import p5a from '../content/ch5-00-intro.html?raw';
import p5b from '../content/07-duplexing.html?raw';
import p5c from '../content/08-sweep.html?raw';
import p5d from '../content/09-dtc.html?raw';
import p5e from '../content/11-implications.html?raw';

const part = (n, title) =>
  `<h1 class="part-divider" id="part-${n}"><span class="part-divider__num">Part ${n}</span>${title}</h1>`;

bootPage([
  intro,
  introStarlink,
  part(1, 'Seeing with Echoes'), p1a, p1b, p1c, p1d,
  part(2, 'Building a Picture'), p2a, p2b, p2c, p2d, p2e,
  part(3, 'Tracking Motion'), p3a, p3b, p3c, p3d, p3e, p3f, p3g,
  part(4, 'How Starlink Talks'), p4a, p4b, p4c, p4d, p4e,
  part(5, 'Is Starlink a Secret Radar?'), p5a, p5b, p5c, p5d, p5e,
]);
