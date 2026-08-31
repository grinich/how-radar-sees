// @ts-check
// Procedural Starlink satellites, dimensioned in metres from SpaceX-published
// sources — no downloaded assets. Geometry per generation:
//
//   V1.5    bus 2.8×1.3 m, one 8.1×2.8 m solar array (~11 m end-to-end), ~306 kg.
//           Dimensions from SpaceX's Oct 2022 FCC filing; component layout (four
//           nadir phased-array panels, two gimballed gateway dishes at one end,
//           perimeter laser pods, mirror-film strips) from the satellite renders in
//           SpaceX's "Brightness Mitigation Best Practices" paper (2022).
//   V2 Mini bus 4.1×2.7 m, two 12.8×4.1 m arrays on V-booms (~30 m span), ~800 kg.
//           5 Ku phased arrays + 3 Ka/E dishes + 3 lasers + argon Hall thruster;
//           wing–bus–wing ribbon per SpaceX's stack photos and S-1 renders.
//   V3      bus ≈8×4 m, two wings of two 19 m blanket segments each (19×5.4 m,
//           ~2× V2 array area, ≈52 m tip-to-tip measured off SpaceX's Starship
//           Flight-11 scale graphic), ~1,900 kg. Four quad-band backhaul dishes on
//           the corners and 3+3 laser terminals on the ends, per starlink.com's
//           V3 page and the official flythrough render.
//
// Axes: wings extend along ±X (the span axis), the bus's long side runs along Z,
// -Y faces Earth (nadir). Origin is the bus centre. Everything is built from
// primitives + canvas textures, so a whole generation is a few hundred KB of GPU
// buffers instead of a multi-MB GLB.

/** Shared materials. One set per scene; the owner disposes them with the scene. */
export function makeSatMats(THREE) {
  const solarFace = solarTexture(THREE);
  const panelFace = arrayTexture(THREE);
  return {
    busSide: new THREE.MeshStandardMaterial({ color: 0x2b313b, roughness: 0.55, metalness: 0.6 }),
    zenith: new THREE.MeshStandardMaterial({ color: 0x9aa4b0, roughness: 0.42, metalness: 0.75 }),
    // Nadir base plate = dielectric mirror film: bright, specular.
    mirror: new THREE.MeshStandardMaterial({ color: 0xc9d2dd, roughness: 0.16, metalness: 0.92 }),
    // Phased-array apertures: near-black with a faint element lattice.
    panel: new THREE.MeshStandardMaterial({
      map: panelFace, color: 0xffffff, roughness: 0.38, metalness: 0.35,
      emissive: 0x0a1526, emissiveIntensity: 0.55,
    }),
    solarFront: new THREE.MeshStandardMaterial({
      map: solarFace, color: 0xffffff, roughness: 0.34, metalness: 0.3,
      emissive: 0x0d1e40, emissiveIntensity: 0.38,
    }),
    solarBack: new THREE.MeshStandardMaterial({ color: 0x6d6a66, roughness: 0.8, metalness: 0.15 }),
    solarEdge: new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.6, metalness: 0.4 }),
    boom: new THREE.MeshStandardMaterial({ color: 0xb9c0cc, roughness: 0.45, metalness: 0.7 }),
    dish: new THREE.MeshStandardMaterial({ color: 0xe2e7ee, roughness: 0.35, metalness: 0.55, side: THREE.DoubleSide }),
    pod: new THREE.MeshStandardMaterial({ color: 0xccd3dd, roughness: 0.5, metalness: 0.5 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x171c24, roughness: 0.5, metalness: 0.4 }),
    thruster: new THREE.MeshStandardMaterial({ color: 0x3c434f, roughness: 0.4, metalness: 0.8 }),
  };
}

// ---------------------------------------------------------------------------
// Textures

/** Solar blanket: navy cells in two stitched columns with silver seams over a
 *  dark red-brown backing (SpaceX darkened the inter-cell material on v1+). */
function solarTexture(THREE) {
  const W = 512, H = 160;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#4a221a'; g.fillRect(0, 0, W, H);          // inter-cell backing
  const rows = 2, cols = 13;                                 // 2 columns × 13 segments
  const sw = W / cols, sh = H / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * sw, y = r * sh;
      const shade = 0.92 + 0.08 * ((c * 7 + r * 3) % 5) / 4; // subtle per-segment variance
      g.fillStyle = `rgb(${Math.round(24 * shade)}, ${Math.round(45 * shade)}, ${Math.round(84 * shade)})`;
      g.fillRect(x + 2, y + 2, sw - 4, sh - 4);
      g.strokeStyle = 'rgba(10, 20, 40, 0.55)';              // fine cell strips
      g.lineWidth = 1;
      for (let i = 5; i < sw - 3; i += 5) {
        g.beginPath(); g.moveTo(x + i, y + 2); g.lineTo(x + i, y + sh - 2); g.stroke();
      }
      // glassy diagonal sheen
      const grad = g.createLinearGradient(x, y, x + sw, y + sh);
      grad.addColorStop(0, 'rgba(150,190,255,0.10)');
      grad.addColorStop(0.5, 'rgba(150,190,255,0)');
      grad.addColorStop(1, 'rgba(80,120,200,0.06)');
      g.fillStyle = grad; g.fillRect(x + 2, y + 2, sw - 4, sh - 4);
    }
  }
  g.strokeStyle = '#98a2b0'; g.lineWidth = 2;                // stitch seams
  g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
  for (let c = 1; c < cols; c++) { g.beginPath(); g.moveTo(c * sw, 0); g.lineTo(c * sw, H); g.stroke(); }
  g.strokeRect(1, 1, W - 2, H - 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Phased-array aperture: near-black face with a faint element lattice. */
function arrayTexture(THREE) {
  const S = 256;
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = '#0a111f'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#18253f';
  for (let y = 6; y < S; y += 11) {
    for (let x = 6; x < S; x += 11) g.fillRect(x, y, 3, 3);
  }
  g.strokeStyle = 'rgba(70, 95, 140, 0.35)'; g.lineWidth = 2;
  g.strokeRect(2, 2, S - 4, S - 4);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ---------------------------------------------------------------------------
// Component builders

/** Thin box helper. */
function box(THREE, mat, w, h, d) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

/** Strut between two points (thin cylinder). */
function strut(THREE, mat, a, b, r = 0.045) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

/** Gimballed parabolic dish of radius R, opening along `aim` (unit-ish vector). */
function dish(THREE, mats, R, aim) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const r = (i / 10) * R;
    pts.push(new THREE.Vector2(Math.max(r, 0.001), 0.30 * (r * r) / R));
  }
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), mats.dish);
  g.add(bowl);
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * R, 0.05 * R, 0.5 * R, 8), mats.dark);
  feed.position.y = 0.28 * R; g.add(feed);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.22 * R, 12, 10), mats.pod);
  hub.position.y = -0.12 * R; g.add(hub);
  const dir = new THREE.Vector3().copy(aim).normalize();
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return g;
}

/** Laser terminal: housing box + telescope snout pointing along ±Z (`dz`). */
function laserPod(THREE, mats, s, dz) {
  const g = new THREE.Group();
  const body = box(THREE, mats.pod, 0.9 * s, 0.7 * s, s);
  g.add(body);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * s, 0.3 * s, 0.5 * s, 12), mats.dark);
  snout.rotation.x = Math.PI / 2;
  snout.position.z = dz * (0.5 * s + 0.22 * s);
  g.add(snout);
  return g;
}

/** Hall-effect thruster on an end face: ring + darker core, axis along Z. */
function thruster(THREE, mats, R) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.06, R * 0.9, 20), mats.thruster);
  ring.rotation.x = Math.PI / 2; g.add(ring);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.55, R * 0.55, R * 0.95, 16), mats.dark);
  core.rotation.x = Math.PI / 2; g.add(core);
  return g;
}

/** Star tracker: small tilted optical cylinder. */
function starTracker(THREE, mats) {
  const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.22, 10), mats.pod);
  g.add(tube);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 10), mats.dark);
  lens.position.y = 0.12; g.add(lens);
  g.rotation.set(0.5, 0, 0.35);
  return g;
}

/**
 * Solar wing extending +X from x=0 (rotate the group for the -X wing).
 * Blanket `len`×`wid` after a `gap` of twin V-booms from the bus edge at x=0.
 */
function wing(THREE, mats, { len, wid, gap, thick = 0.06, busHalfZ }) {
  const g = new THREE.Group();
  const faces = [mats.solarEdge, mats.solarEdge, mats.solarFront, mats.solarBack, mats.solarEdge, mats.solarEdge];
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(len, thick, wid), faces);
  blanket.position.x = gap + len / 2;
  g.add(blanket);
  // Root spar across the blanket's inner edge, then twin booms back to the bus.
  const spar = box(THREE, mats.boom, 0.08, 0.08, wid * 0.72);
  spar.position.x = gap - 0.05;
  g.add(spar);
  const za = Math.min(busHalfZ * 0.72, wid * 0.5);
  const zb = wid * 0.18;
  g.add(strut(THREE, mats.boom, new THREE.Vector3(0.02, 0, za), new THREE.Vector3(gap - 0.06, 0, zb)));
  g.add(strut(THREE, mats.boom, new THREE.Vector3(0.02, 0, -za), new THREE.Vector3(gap - 0.06, 0, -zb)));
  return g;
}

/**
 * Flat bus with a mirror-film nadir face, tiled phased-array apertures below,
 * and a silver zenith face with a central spine truss.
 */
function flatBus(THREE, mats, { X, Z, T, panels, spine = true }) {
  const g = new THREE.Group();
  const faces = [mats.busSide, mats.busSide, mats.zenith, mats.mirror, mats.busSide, mats.busSide];
  const body = new THREE.Mesh(new THREE.BoxGeometry(X, T, Z), faces);
  g.add(body);
  // Phased-array apertures sit just proud of the nadir face.
  for (const p of panels) {
    const m = box(THREE, mats.panel, p.w, 0.03, p.h);
    m.position.set(p.x, -T / 2 - 0.012, p.z);
    g.add(m);
  }
  if (spine) {
    const rail = box(THREE, mats.boom, Math.min(0.12, X * 0.05), T * 0.6, Z * 0.9);
    rail.position.y = T / 2 + T * 0.3;
    g.add(rail);
    const n = Math.max(3, Math.round(Z / 1.4));
    for (let i = 0; i < n; i++) {
      const bar = box(THREE, mats.boom, X * 0.4, T * 0.3, 0.06);
      bar.position.set(0, T / 2 + T * 0.18, -Z * 0.42 + (Z * 0.84) * (i / (n - 1)));
      g.add(bar);
    }
  }
  return g;
}

// ---------------------------------------------------------------------------
// The three generations

/** V1.5 — 2.8×1.3 m bus, one 8.1×2.8 m array; ~11 m end-to-end. */
export function buildV15(THREE, mats = makeSatMats(THREE)) {
  const g = new THREE.Group();
  const X = 1.3, Z = 2.8, T = 0.16;
  // Four user phased arrays fill the nadir aft of the antenna platform.
  const panels = [
    { x: 0, z: -0.32, w: 1.06, h: 0.82 },
    { x: 0, z: 0.55, w: 1.06, h: 0.82 },
    { x: -0.29, z: 1.28, w: 0.48, h: 0.52 },
    { x: 0.29, z: 1.28, w: 0.48, h: 0.52 },
  ];
  g.add(flatBus(THREE, mats, { X, Z, T, panels, spine: false }));

  // Antenna platform at the forward end: two gimballed gateway dishes.
  const d1 = dish(THREE, mats, 0.21, new THREE.Vector3(-0.35, -1, -0.5));
  d1.position.set(-0.3, -T / 2 - 0.12, -1.0); g.add(d1);
  const d2 = dish(THREE, mats, 0.21, new THREE.Vector3(0.35, -1, -0.5));
  d2.position.set(0.3, -T / 2 - 0.12, -1.0); g.add(d2);
  const st = starTracker(THREE, mats);
  st.position.set(0.4, T / 2 + 0.08, -0.7); g.add(st);

  // Laser pods on the fore/aft edges (added on v1.5) + krypton thruster aft.
  const lf = laserPod(THREE, mats, 0.2, -1); lf.position.set(-0.35, 0, -Z / 2 - 0.12); g.add(lf);
  const la = laserPod(THREE, mats, 0.2, 1); la.position.set(0.35, 0, Z / 2 + 0.12); g.add(la);
  const th = thruster(THREE, mats, 0.09); th.position.set(-0.3, 0, Z / 2 + 0.05); g.add(th);

  // Single solar array off the +X edge (~10.5 m end-to-end).
  const w1 = wing(THREE, mats, { len: 8.1, wid: 2.8, gap: 0.9, thick: 0.05, busHalfZ: Z / 2 });
  w1.position.x = X / 2;
  g.add(w1);
  return g;
}

/** V2 Mini — 4.1×2.7 m bus, two 12.8×4.1 m wings; ~30 m tip-to-tip. */
export function buildV2Mini(THREE, mats = makeSatMats(THREE)) {
  const g = new THREE.Group();
  const X = 2.7, Z = 4.1, T = 0.2;
  // Five Ku phased arrays in a 2×3 grid with one slot left for equipment.
  const panels = [];
  const pw = 1.16, ph = 1.22, gx = 0.66, gz = 1.31;
  for (const sx of [-1, 1]) for (const iz of [-1, 0, 1]) {
    if (sx === 1 && iz === 1) continue; // equipment corner
    panels.push({ x: sx * gx, z: iz * gz, w: pw, h: ph });
  }
  g.add(flatBus(THREE, mats, { X, Z, T, panels }));

  // Equipment cluster in the free corner (avionics + GPS puck).
  const eq = box(THREE, mats.pod, 0.7, 0.1, 0.7); eq.position.set(gx, -T / 2 - 0.04, gz); g.add(eq);
  const gps = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 14), mats.dark);
  gps.position.set(gx, -T / 2 - 0.12, gz); g.add(gps);

  // Three Ka/E gimballed dishes on the perimeter: two forward corners, one aft.
  const dl = dish(THREE, mats, 0.28, new THREE.Vector3(-0.4, -1, -0.55));
  dl.position.set(-0.95, -T / 2 - 0.16, -1.8); g.add(dl);
  const dr = dish(THREE, mats, 0.28, new THREE.Vector3(0.4, -1, -0.55));
  dr.position.set(0.95, -T / 2 - 0.16, -1.8); g.add(dr);
  const da = dish(THREE, mats, 0.28, new THREE.Vector3(0, -1, 0.6));
  da.position.set(-0.85, -T / 2 - 0.16, 1.85); g.add(da);

  // Three laser terminals: two forward, one aft. Argon thruster on the aft face.
  const l1 = laserPod(THREE, mats, 0.26, -1); l1.position.set(-0.45, 0.05, -Z / 2 - 0.16); g.add(l1);
  const l2 = laserPod(THREE, mats, 0.26, -1); l2.position.set(0.45, 0.05, -Z / 2 - 0.16); g.add(l2);
  const l3 = laserPod(THREE, mats, 0.26, 1); l3.position.set(0.5, 0.05, Z / 2 + 0.16); g.add(l3);
  const th = thruster(THREE, mats, 0.13); th.position.set(0, 0, Z / 2 + 0.06); g.add(th);
  const st = starTracker(THREE, mats); st.position.set(-0.9, T / 2 + 0.1, -1.2); g.add(st);

  // Twin wings anchored at the bus edges: 2×(1.35+0.85+12.8) = 30 m tip-to-tip.
  const w1 = wing(THREE, mats, { len: 12.8, wid: 4.1, gap: 0.85, busHalfZ: Z / 2 });
  w1.position.x = X / 2;
  g.add(w1);
  const w2 = wing(THREE, mats, { len: 12.8, wid: 4.1, gap: 0.85, busHalfZ: Z / 2 });
  w2.rotation.y = Math.PI;
  w2.position.x = -X / 2;
  g.add(w2);
  return g;
}

/** V3 — ≈8×4 m bus, two 19×5.4 m wings on long booms; ≈52 m tip-to-tip. */
export function buildV3(THREE, mats = makeSatMats(THREE)) {
  const g = new THREE.Group();
  const X = 4.0, Z = 8.0, T = 0.3;
  // The nadir face is essentially all aperture: a 2×4 grid of big panels.
  const panels = [];
  const pw = 1.82, ph = 1.86, gx = 0.98, gz0 = -2.94, dgz = 1.96;
  for (const sx of [-1, 1]) for (let iz = 0; iz < 4; iz++) {
    panels.push({ x: sx * gx, z: gz0 + iz * dgz, w: pw, h: ph });
  }
  g.add(flatBus(THREE, mats, { X, Z, T, panels }));

  // Four quad-band (Ka/E/V/W) backhaul dishes, one per corner, aimed outboard.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const d = dish(THREE, mats, 0.5, new THREE.Vector3(sx * 0.55, -1, sz * 0.55));
    d.position.set(sx * 1.62, -T / 2 - 0.3, sz * 3.5);
    g.add(d);
    const post = strut(THREE, mats.boom,
      new THREE.Vector3(sx * 1.62, -T / 2, sz * 3.5),
      new THREE.Vector3(sx * 1.62, -T / 2 - 0.28, sz * 3.5), 0.05);
    g.add(post);
  }

  // Six 400-Gbps laser terminals: three on each end.
  for (const sz of [-1, 1]) {
    for (const ix of [-1, 0, 1]) {
      const l = laserPod(THREE, mats, 0.3, sz);
      l.position.set(ix * 0.75, 0.08 + (ix === 0 ? 0.06 : 0), sz * (Z / 2 + 0.2));
      g.add(l);
    }
  }
  // Argon Hall thrusters, offset on the aft face; star trackers forward.
  const t1 = thruster(THREE, mats, 0.17); t1.position.set(1.5, 0, Z / 2 + 0.08); g.add(t1);
  const t2 = thruster(THREE, mats, 0.17); t2.position.set(-1.5, 0, Z / 2 + 0.08); g.add(t2);
  const s1 = starTracker(THREE, mats); s1.position.set(1.3, T / 2 + 0.12, -3.2); g.add(s1);
  const s2 = starTracker(THREE, mats); s2.position.set(1.0, T / 2 + 0.12, -2.9); g.add(s2);

  // Twin wings: 19 m blankets (two stitched 2.7 m segments each) on ~5 m booms,
  // anchored at the bus edges: 2×(2+5+19) = 52 m tip-to-tip.
  const w1 = wing(THREE, mats, { len: 19, wid: 5.4, gap: 5.0, thick: 0.07, busHalfZ: Z / 2 });
  w1.position.x = X / 2;
  g.add(w1);
  const w2 = wing(THREE, mats, { len: 19, wid: 5.4, gap: 5.0, thick: 0.07, busHalfZ: Z / 2 });
  w2.rotation.y = Math.PI;
  w2.position.x = -X / 2;
  g.add(w2);
  return g;
}
