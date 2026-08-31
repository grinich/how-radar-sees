// @ts-check
// Ch2 — Back-projection on the GPU. A fragment shader runs the real algorithm for
// every pixel at once: for each of 100 pulses it computes the echo from the point
// targets and adds it back at each pixel's range. Matched pixels sum bright; the
// rest cancel. The aperture builds continuously and you can sharpen it with the
// bandwidth slider — something too slow to do on a CPU in real time.
import { ThreeFigure } from '../core/ThreeFigure.js';

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uK;      // wavenumber (∝ bandwidth/resolution)
uniform float uAp;     // aperture built so far, 0..1
uniform vec3 uTargets[4];
#define NP 100
void main() {
  vec2 g = vUv;                       // ground pixel, 0..1
  float I = 0.0, Q = 0.0, cnt = 0.0;
  for (int n = 0; n < NP; n++) {
    float fn = float(n) / float(NP - 1);
    float wgt = step(fn, uAp);
    vec2 sat = vec2(mix(-0.15, 1.15, fn), -0.55);
    float rI = 0.0, rQ = 0.0;
    for (int t = 0; t < 4; t++) {
      vec3 tg = uTargets[t];
      float R = distance(sat, tg.xy);
      float ph = -2.0 * uK * R;
      rI += tg.z * cos(ph); rQ += tg.z * sin(ph);
    }
    float Rp = distance(sat, g);
    float php = 2.0 * uK * Rp;
    I += wgt * (rI * cos(php) - rQ * sin(php));
    Q += wgt * (rI * sin(php) + rQ * cos(php));
    cnt += wgt;
  }
  float mag = clamp(sqrt(I * I + Q * Q) / max(cnt, 1.0), 0.0, 1.0);
  float b = clamp(pow(mag, 2.4) * 1.15, 0.0, 1.0);   // darken the clutter floor, keep the peaks
  vec3 col = mix(vec3(0.03, 0.05, 0.09), vec3(0.5, 0.82, 1.0), b);
  gl_FragColor = vec4(col, 1.0);
}`;

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

export default class ShaderBackprojection extends ThreeFigure {
  controlsSchema = [
    { type: 'range', name: 'k', label: 'Bandwidth', min: 20, max: 90, step: 2, value: 55, format: (v) => `${Math.round(v * 6)} MHz` },
  ];

  build(THREE) {
    this.orbit.enableRotate = false; this.orbit.enableZoom = false; // flat forward view
    this.camera.position.set(0, 0, 2.2); this.camera.lookAt(0, 0, 0);
    this.uniforms = {
      uK: { value: 55 }, uAp: { value: 0 },
      uTargets: { value: [new THREE.Vector3(0.35, 0.42, 1), new THREE.Vector3(0.5, 0.42, 1), new THREE.Vector3(0.65, 0.42, 1), new THREE.Vector3(0.5, 0.62, 1)] },
    };
    this.mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG });
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
    this.scene.add(this.plane);
    this.fitPlane();
  }

  fitPlane() {
    if (!this.plane) return;
    const dist = this.camera.position.z, vFov = this.camera.fov * Math.PI / 180;
    const hgt = 2 * dist * Math.tan(vFov / 2);
    this.plane.scale.set(hgt * this.camera.aspect, hgt, 1);
  }

  onResize() { super.onResize(); this.fitPlane(); }

  update(dt) {
    this._t = (this._t || 0) + dt;
    this.uniforms.uK.value = this.params.k;
    this.uniforms.uAp.value = Math.min(1, ((this._t % 7) / 4.5));
  }
}
