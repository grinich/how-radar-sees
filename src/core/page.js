// @ts-check
// Single-page boot: assemble section partials, mount figures, build the long
// right-hand table of contents, and wire the global pause.
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/figure.css';
import '../styles/controls.css';
import '../styles/nav.css';

import { scheduler } from './scheduler.js';
import { makeControls } from './controls.js';
import { palette } from './theme.js';
import { mountAll } from './runtime.js';
import { decorateGlossary } from './glossary.js';
import { decorateEntities } from './entities.js';

/** Decorate the build-time-inlined prose and mount the interactive layer. */
export function bootPage() {
  const app = document.getElementById('app');
  if (!app.children.length) {
    console.error('bootPage: no inlined prose found — is the inline-prose Vite plugin running?');
    return;
  }

  decorateGlossary(app);
  decorateEntities(app);
  mountAll({ scheduler, makeControls, palette });
  buildTOC();
}

function buildTOC() {
  const app = document.getElementById('app');
  const heads = [...app.querySelectorAll('h1, h2')];
  if (heads.length < 3) return;

  const toc = document.createElement('nav');
  toc.className = 'toc';
  toc.id = 'toc';
  toc.tabIndex = -1; // focus target for the skip link
  toc.setAttribute('aria-label', 'Contents');
  const list = document.createElement('div');
  list.className = 'toc__list';
  heads.forEach((h, i) => {
    if (!h.id) h.id = 'sec-' + i;
    const a = document.createElement('a');
    a.href = '#' + h.id;
    if (h.tagName === 'H1') {
      const num = h.querySelector('.part-divider__num');
      const title = (num?.nextSibling?.textContent || h.textContent).trim();
      a.textContent = num ? `${num.textContent.trim()} · ${title}` : title;
    } else {
      a.textContent = h.textContent;
    }
    a.className = 'toc__item ' + (h.tagName === 'H1' ? 'toc__item--part' : 'toc__item--sec');
    list.append(a);
  });
  toc.append(list);
  // Before <main>, so keyboard users reach navigation without traversing the essay.
  document.body.insertBefore(toc, document.querySelector('main'));
  const openOverlay = buildMobileToc(toc);
  buildSkipLink(toc, openOverlay);

  // Hide the TOC while the header is on screen, so they never overlap.
  const header = document.querySelector('.site-header');
  if (header) {
    toc.classList.add('is-hidden');
    const ho = new IntersectionObserver((entries) => {
      for (const e of entries) toc.classList.toggle('is-hidden', e.isIntersecting);
    }, { threshold: 0 });
    ho.observe(header);
  }

  // Active section = the last heading scrolled above a threshold near the top.
  // Scroll-based (not a narrow IntersectionObserver band) so it updates reliably
  // on click-jumps and inside tall sections.
  const links = [...list.querySelectorAll('a')];
  const linkFor = new Map(links.map((l) => [l.getAttribute('href').slice(1), l]));
  let active = null;
  const THRESH = 120;

  function updateActive() {
    let current = heads[0];
    for (const h of heads) {
      if (h.getBoundingClientRect().top - THRESH <= 0) current = h; else break;
    }
    const link = linkFor.get(current.id);
    if (!link || link === active) return;
    active?.classList.remove('is-active');
    active?.removeAttribute('aria-current');
    link.classList.add('is-active');
    link.setAttribute('aria-current', 'true');
    active = link;
    // keep it visible inside the TOC without moving the page
    const tr = toc.getBoundingClientRect(), lr = link.getBoundingClientRect();
    if (lr.top < tr.top + 8) toc.scrollTop -= (tr.top + 8 - lr.top);
    else if (lr.bottom > tr.bottom - 8) toc.scrollTop += (lr.bottom - (tr.bottom - 8));
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateActive(); ticking = false; });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateActive();
}

/**
 * Below the desktop breakpoint (1180px, see nav.css) the TOC is hidden; a fixed
 * "Contents" button toggles it as an overlay panel instead.
 * @param {HTMLElement} toc
 * @returns {() => void} function that opens the overlay
 */
function buildMobileToc(toc) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'toc-fab';
  btn.textContent = 'Contents';
  btn.setAttribute('aria-label', 'Table of contents');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', toc.id);

  const backdrop = document.createElement('div');
  backdrop.className = 'toc-backdrop';

  const open = () => {
    toc.classList.add('is-open');
    backdrop.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
  };
  const close = (refocus = false) => {
    if (!toc.classList.contains('is-open')) return;
    toc.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    if (refocus) btn.focus();
  };

  btn.addEventListener('click', () => (toc.classList.contains('is-open') ? close() : open()));
  backdrop.addEventListener('click', () => close());
  toc.addEventListener('click', (e) => {
    if (/** @type {HTMLElement} */ (e.target).closest('a')) close();
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(true); });

  toc.after(btn);
  document.body.append(backdrop);
  return open;
}

/**
 * Visually-hidden "skip to contents" link, first in the tab order (see base.css).
 * @param {HTMLElement} toc
 * @param {() => void} openOverlay
 */
function buildSkipLink(toc, openOverlay) {
  const a = document.createElement('a');
  a.className = 'skip-link';
  a.href = '#' + toc.id;
  a.textContent = 'Skip to table of contents';
  a.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.matchMedia('(max-width: 1180px)').matches) openOverlay();
    else toc.classList.remove('is-hidden'); // it hides behind the header at the top of the page
    const first = toc.querySelector('a');
    (first || toc).focus();
  });
  document.body.prepend(a);
}
