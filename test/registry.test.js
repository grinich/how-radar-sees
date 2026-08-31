// @ts-check
// The registry and the prose must agree: every <figure data-figure="id"> in
// src/content must have a registry entry, and every registry entry must be
// used by the prose. A typo on either side is a silently blank figure.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { registry } from '../src/core/registry.js';

const CONTENT_DIR = join(__dirname, '..', 'src', 'content');

function contentFigureIds() {
  const ids = new Set();
  for (const f of readdirSync(CONTENT_DIR)) {
    if (!f.endsWith('.html')) continue;
    const html = readFileSync(join(CONTENT_DIR, f), 'utf8');
    for (const m of html.matchAll(/data-figure="([^"]+)"/g)) ids.add(m[1]);
  }
  return ids;
}

describe('figure registry ↔ content consistency', () => {
  const inContent = contentFigureIds();
  const inRegistry = new Set(Object.keys(registry));

  it('every data-figure in the prose has a registry entry', () => {
    const missing = [...inContent].filter((id) => !inRegistry.has(id));
    expect(missing).toEqual([]);
  });

  it('every registry entry is used by the prose', () => {
    const unused = [...inRegistry].filter((id) => !inContent.has(id));
    expect(unused).toEqual([]);
  });
});
