// @ts-check
// Part 5 — Coverage & revisit. A satellite in a 53°-inclined LEO traces a real
// ground track (period from GM, nodal drift from Earth's rotation) and paints a
// swath beneath it. One satellite leaves gaps a place waits days to fill; crank
// the count up and the same swath closes to hours, then minutes. This is why
// persistent surveillance is a constellation problem, not an antenna problem.
import { Canvas2DFigure } from '../core/Canvas2DFigure.js';
import { rgba, FONT } from '../core/draw.js';
import { R_E, GM, OMEGA_E, DEG } from '../physics/constants.js';
import coastlines from '../assets/coastline.json';

const INC = 53 * DEG;             // Starlink's shell inclination
const R_E_KM = R_E / 1000;
const MARKER = { lat: 50, lon: 8 }; // spot whose revisit we time; near the 53°
                                    // inclination limit, where passes bunch up

export default class CoverageRevisit extends Canvas2DFigure {
  mode = 'animated';

  controlsSchema = [
    { type: 'range', name: 'alt', label: 'Altitude', min: 300, max: 1200, step: 10, value: 550, format: (v) => `${v} km` },
    { type: 'range', name: 'swath', label: 'Swath width', min: 20, max: 1200, step: 20, value: 300, format: (v) => `${v} km` },
    { type: 'range', name: 'sats', label: 'Satellites', min: 1, max: 40, step: 1, value: 1, format: (v) => `${v}` },
    { type: 'range', name: 'speed', label: 'Speed', min: 5, max: 120, step: 5, value: 40, format: (v) => `${v} min/s` },
  ];

  init() {
    this.cover = document.createElement('canvas');
    super.init();
    this.reset();
  }

  onResize() {
    super.onResize();
    this._layout();
    this.reset();
  }

  onChange() { this.reset(); }

  _layout() {
    this.mapY = this.w < 480 ? 6 : 8;
    this.mapH = Math.round((this.h - (this.w < 480 ? 78 : 92)) );
    this.cover.width = Math.max(2, Math.round(this.w));
    this.cover.height = Math.max(2, this.mapH);
    this.coverG = this.cover.getContext('2d');
  }

  reset() {
    if (!this.coverG) this._layout();
    this.coverG.clearRect(0, 0, this.cover.width, this.cover.height);
    this.simMin = 0;         // simulated minutes elapsed
    this.covered = false;    // is the marker currently under a swath
    this.lastVisit = null;   // sim-minute of last coverage onset
    this.sumGap = 0;         // running sum of revisit gaps
    this.nGap = 0;           // number of gaps measured
    this.revisitMin = null;  // average measured gap (minutes)
  }

  // Sub-satellite lat/lon (deg) for satellite k of N at simulated seconds t.
  _subPoint(k, N, t) {
    const alt = this.params.alt * 1000;
    const n = Math.sqrt(GM / (R_E + alt) ** 3);        // mean motion, rad/s
    const u = n * t + (2 * Math.PI * k) / N;           // argument of latitude, phased
    const node0 = (2 * Math.PI * k) / N;               // ascending nodes spread in RAAN
    const lat = Math.asin(Math.sin(INC) * Math.sin(u));
    const dLon = Math.atan2(Math.cos(INC) * Math.sin(u), Math.cos(u));
    let lon = node0 + dLon - OMEGA_E * t;              // Earth turns under the orbit
    lon = ((lon + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    return { lat: lat / DEG, lon: lon / DEG };
  }

  _period() { return 2 * Math.PI * Math.sqrt((R_E + this.params.alt * 1000) ** 3 / GM); }

  update(dt) {
    if (!this.coverG) return;
    const w = this.w, mapH = this.mapH;
    const N = this.params.sats;
    const halfDeg = (this.params.swath / 2) / R_E_KM / DEG;   // half-swath in degrees
    const pxLon = w / 360, pxLat = mapH / 180;
    const stepMin = dt * this.params.speed;
    // Sub-step fine enough that the along-track advance stays under a quarter
    // swath — otherwise a fast pass skips over a point without registering, and
    // the ribbon paints as dashes. Ground speed ~7 km/s.
    const groundKmPerMin = 7 * 60;
    const subs = Math.min(240, Math.max(1, Math.ceil((stepMin * groundKmPerMin) / (this.params.swath / 4))));
    for (let s = 0; s < subs; s++) {
      this.simMin += stepMin / subs;
      const t = this.simMin * 60;
      let nowCovered = false;
      for (let k = 0; k < N; k++) {
        const p = this._subPoint(k, N, t);
        // paint the swath footprint
        const x = (p.lon + 180) * pxLon;
        const y = (90 - p.lat) * pxLat;
        const rx = Math.min(w * 0.5, (halfDeg / Math.max(0.15, Math.cos(p.lat * DEG))) * pxLon);
        const ry = halfDeg * pxLat;
        this.coverG.fillStyle = rgba(this.palette.accent, 0.5);
        this._stampEllipse(x, y, rx, ry, w);
        // is the marker under this footprint?
        if (haversineKm(p.lat, p.lon, MARKER.lat, MARKER.lon) < this.params.swath / 2) nowCovered = true;
      }
      if (nowCovered && !this.covered) {
        if (this.lastVisit != null) {
          this.sumGap += this.simMin - this.lastVisit;
          this.nGap++;
          this.revisitMin = this.sumGap / this.nGap;   // average gap, less noisy
        }
        this.lastVisit = this.simMin;
      }
      this.covered = nowCovered;
    }
    this.draw();
  }

  _stampEllipse(x, y, rx, ry, w) {
    const g = this.coverG;
    // wrap horizontally so a swath crossing the date line paints both edges
    for (const off of [-w, 0, w]) {
      g.beginPath();
      g.ellipse(x + off, y, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  draw() {
    const g = this.g, w = this.w, h = this.h, c = this.palette;
    if (!g || !this.coverG) return;
    const narrow = w < 480;
    g.fillStyle = c.figBg; g.fillRect(0, 0, w, h);
    const mapY = this.mapY, mapH = this.mapH;

    // ocean panel
    g.fillStyle = rgba(c.echoCol, 0.06);
    g.fillRect(0, mapY, w, mapH);

    // accumulated coverage
    g.drawImage(this.cover, 0, mapY);

    // graticule
    g.strokeStyle = rgba(c.rule, 0.5); g.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) { const y = mapY + (90 - lat) / 180 * mapH; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let lon = -120; lon <= 120; lon += 60) { const x = (lon + 180) / 360 * w; g.beginPath(); g.moveTo(x, mapY); g.lineTo(x, mapY + mapH); g.stroke(); }

    // coastlines
    g.strokeStyle = rgba(c.ink, 0.55); g.lineWidth = 1;
    for (const line of coastlines) {
      g.beginPath();
      for (let i = 0; i < line.length; i++) {
        const x = (line[i][0] + 180) / 360 * w, y = mapY + (90 - line[i][1]) / 180 * mapH;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }

    // live satellites + their swaths
    const N = this.params.sats, t = this.simMin * 60;
    const halfDeg = (this.params.swath / 2) / R_E_KM / DEG;
    for (let k = 0; k < N; k++) {
      const p = this._subPoint(k, N, t);
      const x = (p.lon + 180) / 360 * w, y = mapY + (90 - p.lat) / 180 * mapH;
      const ry = halfDeg / 180 * mapH;
      g.strokeStyle = rgba(c.txCol, 0.5); g.lineWidth = 1;
      g.beginPath(); g.ellipse(x, y, Math.min(w * 0.5, ry / Math.max(0.15, Math.cos(p.lat * DEG))), ry, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = c.txCol; g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill();
    }

    // the marker we time
    const mx = (MARKER.lon + 180) / 360 * w, my = mapY + (90 - MARKER.lat) / 180 * mapH;
    g.strokeStyle = this.covered ? c.goodCol : c.badCol; g.lineWidth = 2;
    g.beginPath(); g.arc(mx, my, 5, 0, Math.PI * 2); g.stroke();

    // HUD
    const T = this._period();
    const spacingKm = OMEGA_E * T * R_E_KM * Math.cos(0);   // equatorial ground-track spacing
    const y0 = mapY + mapH + (narrow ? 16 : 20);
    g.textAlign = 'left'; g.font = `${narrow ? 11 : 12}px ${FONT}`;
    g.fillStyle = c.muted;
    g.fillText(`orbit ${(T / 60).toFixed(0)} min · track spacing ${spacingKm.toFixed(0)} km at the equator · elapsed ${fmtDur(this.simMin)}`, 4, y0);

    g.font = `700 ${narrow ? 12 : 14}px ${FONT}`;
    if (this.revisitMin != null) {
      g.fillStyle = c.goodCol;
      g.fillText(`average revisit at the marker: ${fmtDur(this.revisitMin)}`, 4, y0 + (narrow ? 18 : 22));
    } else if (this.lastVisit != null) {
      g.fillStyle = c.ink;
      g.fillText(`first look at the marker — waiting for the next…`, 4, y0 + (narrow ? 18 : 22));
    } else {
      g.fillStyle = c.muted;
      g.fillText(`waiting for the first pass over the marker…`, 4, y0 + (narrow ? 18 : 22));
    }
  }
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * DEG, dLon = (lon2 - lon1) * DEG;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * R_E_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

function fmtDur(min) {
  if (min < 90) return `${min.toFixed(0)} min`;
  const hr = min / 60;
  if (hr < 36) return `${hr.toFixed(1)} h`;
  return `${(hr / 24).toFixed(1)} days`;
}
