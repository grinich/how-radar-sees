// @ts-check
// Web Worker that owns SGP4 for the live-constellation figure: parses the TLE
// file once, then answers "where is everything at sim time t?" requests with
// transferable ECEF position/velocity buffers. The main thread interpolates
// between two such snapshots per frame, so 10k+ satellites cost it almost nothing.
import { parseTle, snapshot } from '../core/sgp4.js';

let satrecs = [];

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'init') {
    const parsed = parseTle(msg.text);
    satrecs = parsed.satrecs;
    self.postMessage({ type: 'ready', count: satrecs.length, epochMs: parsed.epochMs });
  } else if (msg.type === 'frame') {
    const pos = new Float32Array(3 * satrecs.length);
    const vel = new Float32Array(3 * satrecs.length);
    snapshot(satrecs, msg.t, pos, vel);
    self.postMessage(
      { type: 'frame', t: msg.t, slot: msg.slot, gen: msg.gen, pos: pos.buffer, vel: vel.buffer },
      [pos.buffer, vel.buffer],
    );
  }
};
