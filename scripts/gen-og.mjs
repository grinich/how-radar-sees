// Generates public/og.png (1200×630 social share card) from an SVG.
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync, mkdirSync } from 'node:fs';

const W = 1200, H = 630;
const cx = 905, cy = 335, R = 232;

// orbit rings (rotated ellipses) + satellite dots — a constellation motif
let orbits = '';
for (let i = 0; i < 6; i++) {
  const rot = (i * 30);
  orbits += `<ellipse cx="${cx}" cy="${cy}" rx="${R + 26}" ry="${(R + 26) * 0.32}" fill="none" stroke="#5b8fd0" stroke-opacity="0.28" stroke-width="1.5" transform="rotate(${rot} ${cx} ${cy})"/>`;
}
let dots = '';
const rnd = (i) => { const s = Math.sin(i * 12.9898) * 43758.5; return s - Math.floor(s); };
for (let i = 0; i < 46; i++) {
  const a = rnd(i) * Math.PI * 2, rr = (R + 26) * (0.86 + rnd(i + 9) * 0.2);
  const rot = (Math.floor(rnd(i + 3) * 6) * 30) * Math.PI / 180;
  let x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.32;
  const xr = x * Math.cos(rot) - y * Math.sin(rot), yr = x * Math.sin(rot) + y * Math.cos(rot);
  dots += `<circle cx="${(cx + xr).toFixed(1)}" cy="${(cy + yr).toFixed(1)}" r="2.6" fill="#ffffff" fill-opacity="0.9"/>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" cx="72%" cy="26%" r="95%">
      <stop offset="0%" stop-color="#17325d"/><stop offset="58%" stop-color="#0b1526"/><stop offset="100%" stop-color="#070d18"/>
    </radialGradient>
    <radialGradient id="globe" cx="42%" cy="38%" r="70%">
      <stop offset="0%" stop-color="#1b4a7e"/><stop offset="100%" stop-color="#0d233e"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g opacity="0.9">
    ${orbits}
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#globe)"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${R * 0.34}" fill="none" stroke="#5b8fd0" stroke-opacity="0.35" stroke-width="1.5"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${R * 0.62}" ry="${R}" fill="none" stroke="#5b8fd0" stroke-opacity="0.22" stroke-width="1.5"/>
    <line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="#5b8fd0" stroke-opacity="0.22" stroke-width="1.5"/>
    ${dots}
  </g>
  <text x="80" y="150" font-family="Helvetica, Arial, sans-serif" font-size="25" font-weight="700" letter-spacing="7" fill="#7fb0e6">AN INTERACTIVE ESSAY</text>
  <text x="74" y="300" font-family="Helvetica, Arial, sans-serif" font-size="102" font-weight="700" letter-spacing="-3" fill="#ffffff">How Radar Sees</text>
  <text x="80" y="372" font-family="Helvetica, Arial, sans-serif" font-size="40" fill="#c9d4e2">and why Starlink might be watching</text>
  <text x="80" y="566" font-family="Helvetica, Arial, sans-serif" font-size="27" fill="#6f8199">how-radar-sees.pages.dev  ·  46 interactive figures on radar &amp; SAR</text>
</svg>`;

mkdirSync('public', { recursive: true });
const png = new Resvg(svg, { fitTo: { mode: 'width', value: W }, background: '#070d18' }).render().asPng();
writeFileSync('public/og.png', png);
console.log('wrote public/og.png', png.length, 'bytes');
