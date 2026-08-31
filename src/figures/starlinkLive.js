// @ts-check
// §0 hero — the real Starlink constellation, live. Downloads the current public
// orbital elements (TLEs) for every catalogued Starlink satellite and propagates
// them with SGP4, so each dot is an actual satellite where it actually is right
// now. A worker computes ECEF snapshots at two nearby sim times; per frame we
// cubic-Hermite interpolate between them, so 10k+ satellites render smoothly at
// any time speed. Drag to rotate; crank time to watch the shells sweep by.
import { ThreeFigure } from '../core/ThreeFigure.js';
import { palette } from '../core/theme.js';
import { buildGlobe, EARTH_RADIUS_KM } from '../core/globe.js';
import { loadTle } from '../core/tle.js';

const R_EARTH = 2;                       // scene units
const K = R_EARTH / EARTH_RADIUS_KM;     // km -> scene units
const CAM_DIST = 6.7;                    // camera distance from Earth's center at 1x zoom
// Snapshot spacing in sim ms: ~1 s of real time per window at high speeds, but
// never narrower than 30 s of sim time so the worker idles at 1x (Hermite
// interpolation keeps even a 600 s window within a few km of truth).
const gapMs = (speed) => Math.max(speed, 30) * 1000;

const CLOCK_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC', month: 'short', day: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

export default class StarlinkLive extends ThreeFigure {
  controlsSchema = [
    { type: 'segmented', name: 'speed', label: 'Time', value: 1, options: [['Live', 1], ['60×', 60], ['600×', 600]] },
    { type: 'range', name: 'zoom', label: 'Zoom', min: 1, max: 2.4, step: 0.05, value: 1, format: (v) => `${v.toFixed(2)}×` },
  ];

  build(THREE) {
    this.globe = buildGlobe(THREE, R_EARTH, palette());
    this.scene.add(this.globe);
    this.camera.position.set(0, 2.0, 6.4);
    this.orbit.target.set(0, 0, 0);

    this.simMs = Date.now();
    this._gen = 0;
    this.A = this.B = this.N = null;      // snapshot window: interpolate A->B, N pre-fetched
    this._inflight = false;
    this._lastClockS = 0;

    this._makeReadout();
    this._start();
  }

  async _start() {
    try {
      const { text, source, fetchedAt } = await loadTle();
      if (this._dead) return;
      this._meta = { source, fetchedAt };
      this.worker = new Worker(new URL('./satWorker.js', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e) => {
        if (this._dead) return;
        if (e.data.type === 'ready') this._onReady(e.data);
        else if (e.data.type === 'frame') this._onFrame(e.data);
      };
      this.worker.postMessage({ type: 'init', text });
    } catch {
      this._status.textContent = 'orbital data unavailable — reload to retry';
    }
  }

  _onReady({ count, epochMs }) {
    const THREE = this.THREE;
    this.ptsGeo = new THREE.BufferGeometry();
    this.ptsPos = new Float32Array(3 * count);
    const attr = new THREE.BufferAttribute(this.ptsPos, 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    this.ptsGeo.setAttribute('position', attr);
    this.ptsMat = new THREE.PointsMaterial({
      size: 0.026, map: dotTexture(THREE), color: 0xdfeaff,
      transparent: true, opacity: 0.9, depthWrite: false, sizeAttenuation: true,
    });
    const points = new THREE.Points(this.ptsGeo, this.ptsMat);
    points.frustumCulled = false; // positions stream in; skip bounding-sphere upkeep
    this.globe.add(points);

    this._count.textContent = count.toLocaleString();
    const { source, fetchedAt } = this._meta;
    const src = source === 'snapshot'
      ? `elements: bundled snapshot (${new Date(fetchedAt).toISOString().slice(0, 10)})`
      : `elements: CelesTrak, ${fmtAge(Date.now() - epochMs)} old`;
    this._status.textContent = src;
    this._countWrap.hidden = false;
    this._clock.hidden = false;
    this._ensure();
  }

  _request(t, slot) {
    this._inflight = true;
    this.worker.postMessage({ type: 'frame', t, slot, gen: this._gen });
  }

  _onFrame(m) {
    this._inflight = false;
    if (m.gen === this._gen) {
      const snap = { t: m.t, pos: new Float32Array(m.pos), vel: new Float32Array(m.vel) };
      if (m.slot === 'A') this.A = snap;
      else if (m.slot === 'B') this.B = snap;
      else this.N = snap;
      // Repaint even when paused (reduced motion / pause button): the figure
      // should still show the constellation as of "now".
      if (this.ptsGeo && this.A) { this._writePositions(); this.draw(); }
    }
    this._ensure();
  }

  /** Keep the A->B window (plus one pre-fetched snapshot N) populated. */
  _ensure() {
    if (this._dead || !this.ptsGeo || this._inflight) return;
    const gap = gapMs(this.params.speed);
    if (!this.A) this._request(this.simMs, 'A');
    else if (!this.B) this._request(this.A.t + gap, 'B');
    else if (!this.N) this._request(this.B.t + gap, 'N');
  }

  _resetWindows() {
    this._gen++;             // in-flight responses for the old timeline are dropped
    this.A = this.B = this.N = null;
    this._ensure();
  }

  onChange(name, value) {
    if (name === 'zoom') {
      // Dolly along the current view direction (scroll-zoom is disabled so the
      // canvas never traps page scroll); at 2.4x the camera stays outside the shells.
      const d = CAM_DIST / value;
      this.camera.position.setLength(d);
      // Drag rotates by angle-per-pixel, which feels wildly amplified up close —
      // scale it with the camera-to-surface distance so a drag moves the ground
      // under the cursor about the same at every zoom level.
      this.orbit.rotateSpeed = (d - R_EARTH) / (CAM_DIST - R_EARTH);
      this.draw();
      return;
    }
    if (name === 'speed' && value === 1) { this.simMs = Date.now(); }
    this._ensure();
  }

  update(dt) {
    const sp = this.params.speed;
    this.simMs = sp === 1 ? Date.now() : this.simMs + dt * 1000 * sp;
    // sim clock jumped out of reach of the window (switched back to Live, or the
    // tab slept for a while) -> rebuild it at the current time instead of chasing
    if (this.A && this.simMs < this.A.t - 250) this._resetWindows();
    if (this.B && this.simMs > this.B.t + 2 * gapMs(sp)) this._resetWindows();
    if (this.B && this.N && this.simMs >= this.B.t) { this.A = this.B; this.B = this.N; this.N = null; }
    this._ensure();
    if (this.ptsGeo && this.A) this._writePositions();
    this.globe.rotation.y += dt * 0.02;
    this._updateClock();
    this.orbit?.update();
  }

  /** Cubic Hermite between snapshots A and B, ECEF km -> scene units. */
  _writePositions() {
    const { A, B } = this, arr = this.ptsPos;
    let h00 = 1, h10 = 0, h01 = 0, h11 = 0, dtw = 0;
    if (B && B.t > A.t) {
      const s = Math.max(0, Math.min(1, (this.simMs - A.t) / (B.t - A.t)));
      const s2 = s * s, s3 = s2 * s;
      h00 = 2 * s3 - 3 * s2 + 1; h10 = s3 - 2 * s2 + s;
      h01 = -2 * s3 + 3 * s2; h11 = s3 - s2;
      dtw = (B.t - A.t) / 1000;
    }
    const pa = A.pos, va = A.vel, pb = (B || A).pos, vb = (B || A).vel;
    for (let i = 0; i < pa.length; i += 3) {
      const x = h00 * pa[i] + h10 * dtw * va[i] + h01 * pb[i] + h11 * dtw * vb[i];
      const y = h00 * pa[i + 1] + h10 * dtw * va[i + 1] + h01 * pb[i + 1] + h11 * dtw * vb[i + 1];
      const z = h00 * pa[i + 2] + h10 * dtw * va[i + 2] + h01 * pb[i + 2] + h11 * dtw * vb[i + 2];
      if (Number.isFinite(x)) {
        // ECEF -> scene: +y = north pole, east runs the right way on screen
        arr[i] = x * K; arr[i + 1] = z * K; arr[i + 2] = -y * K;
      } else {
        arr[i] = arr[i + 1] = arr[i + 2] = 0; // decayed/unpropagatable: hide inside the globe
      }
    }
    this.ptsGeo.attributes.position.needsUpdate = true;
  }

  _makeReadout() {
    const d = document.createElement('div');
    d.className = 'fig__readout';
    this._countWrap = document.createElement('span');
    this._count = document.createElement('b');
    this._countWrap.append(this._count, ' satellites');
    this._countWrap.hidden = true;
    this._clock = document.createElement('span');
    this._clock.hidden = true;
    this._status = document.createElement('span');
    this._status.textContent = 'loading orbital elements…';
    d.append(this._countWrap, this._clock, this._status);
    this.root.append(d);
    this._readout = d;
  }

  _updateClock() {
    const s = Math.floor(this.simMs / 1000);
    if (s === this._lastClockS || this._clock.hidden) return;
    this._lastClockS = s;
    const label = this.params.speed === 1 ? '' : ' (sim)';
    this._clock.textContent = `${CLOCK_FMT.format(this.simMs)} UTC${label}`;
  }

  teardown() {
    this._dead = true;
    this.worker?.terminate();
    this.ptsMat?.map?.dispose();
    this._readout?.remove();
    super.teardown();
  }
}

/** Small radial-gradient sprite so each satellite renders as a soft dot. */
function dotTexture(THREE) {
  const s = 64, cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function fmtAge(ms) {
  const h = ms / 3600000;
  if (h < 1) return '<1 h';
  if (h < 48) return `~${Math.round(h)} h`;
  return `~${Math.round(h / 24)} d`;
}
