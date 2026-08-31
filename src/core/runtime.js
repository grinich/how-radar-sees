// @ts-check
// Lazy-mounts figures on scroll approach and pauses them when they leave the
// viewport. One IntersectionObserver mounts/pauses; a second, much wider one
// tears figures down completely (canvas, GL context, listeners, workers) when
// the reader has scrolled far away, and the first remounts them on re-approach.
// Animated figures also get their own pause button in the top-right corner.
import { registry } from './registry.js';
import { scheduler } from './scheduler.js';
import { onThemeChange } from './theme.js';

const live = new Map(); // element -> figure instance | 'loading'
// Desired states, updated synchronously by the observer callbacks so the async
// mount path can re-check them after each await. Without this, a fling-scroll
// past a figure whose init() awaits a big import leaves it animating forever
// off-screen (the exit fires while the value is still the 'loading' sentinel).
const wanted = new WeakSet(); // inside the mount band: should be running
const near = new WeakSet();   // inside the outer band: should stay mounted

const REDUCE = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const PAUSE_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
const PLAY_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';

const io = new IntersectionObserver(onIntersect, { rootMargin: '200px 0px', threshold: 0 });
const farIo = new IntersectionObserver(onFar, { rootMargin: '2000px 0px', threshold: 0 });

/** Observe every [data-figure] mount point on the page. */
export function mountAll(services) {
  document.querySelectorAll('[data-figure]').forEach((el) => {
    el.__services = services;
    el.__origKids = new Set(el.children); // the static markup (figcaption); everything else is figure-added
    near.add(el); // assume near until farIo's initial callback says otherwise
    io.observe(el);
    farIo.observe(el);
  });
}

// 2D figures re-read the palette and redraw on theme change. 3D figures bake
// palette colors into materials at build(), so remount them — the same
// teardown/mount path scrolling exercises — to rebuild with the new palette.
onThemeChange(() => {
  for (const [el, fig] of [...live]) {
    if (fig !== 'loading' && fig.remountOnThemeChange) { unmount(el); mount(el); }
  }
});

/** Give an animated figure its own pause/play button, anchored to the canvas. */
function addPauseButton(el, fig) {
  const cv = el.querySelector('canvas');
  if (!cv) return;
  // Wrap the canvas so the button can anchor to the animation, not the caption.
  let stage = cv.parentElement;
  if (!stage || !stage.classList.contains('fig__stage')) {
    stage = document.createElement('div');
    stage.className = 'fig__stage';
    cv.parentNode.insertBefore(stage, cv);
    stage.appendChild(cv);
  }
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fig__pause';
  const render = () => {
    const p = !!fig._paused;
    btn.setAttribute('aria-pressed', String(p));
    btn.setAttribute('aria-label', p ? 'Play animation' : 'Pause animation');
    btn.title = p ? 'Play' : 'Pause';
    btn.innerHTML = p ? PLAY_ICON : PAUSE_ICON;
  };
  btn.addEventListener('click', () => { scheduler.setPaused(fig, !fig._paused); render(); });
  stage.appendChild(btn);
  render();
}

// Kept synchronous so `wanted` always reflects the latest enter/exit, even for
// elements still in the async mount path.
function onIntersect(entries) {
  for (const e of entries) {
    const el = /** @type {HTMLElement} */ (e.target);
    if (e.isIntersecting) wanted.add(el); else wanted.delete(el);
    const fig = live.get(el);
    if (e.isIntersecting) {
      if (fig === undefined) mount(el);
      else if (fig !== 'loading') {
        fig.onVisible();
        if (fig.mode === 'animated') scheduler.add(fig);
      }
    } else if (fig && fig !== 'loading') {
      scheduler.remove(fig);
      fig.onHidden();
    }
  }
}

async function mount(el) {
  const load = registry[el.dataset.figure];
  if (!load) return;
  live.set(el, 'loading'); // guard against double-mount
  try {
    const mod = await load();
    const fig = new mod.default(el, el.__services);
    live.set(el, fig);
    el.classList.add('is-live');
    await fig.init();
    el.style.minHeight = ''; // drop the height freeze from a previous teardown
    if (fig.mode === 'animated') {
      if (REDUCE) fig._paused = true; // honor reduced-motion: start held
      addPauseButton(el, fig);
    }
    // The awaits above can outlast a fast scroll: only start if still on screen.
    if (wanted.has(el)) {
      fig.onVisible();
      if (fig.mode === 'animated') scheduler.add(fig);
    } else {
      fig.onHidden();
    }
    if (!near.has(el)) unmount(el); // scrolled far past while loading
  } catch (err) {
    console.error(`Figure "${el.dataset.figure}" failed to mount:`, err);
    live.delete(el);
    el.classList.add('fig--error');
  }
}

function onFar(entries) {
  for (const e of entries) {
    const el = /** @type {HTMLElement} */ (e.target);
    if (e.isIntersecting) near.add(el);
    else { near.delete(el); unmount(el); } // 'loading' mounts self-unmount on completion
  }
}

/** Tear a mounted figure all the way down; io (still observing) remounts it. */
function unmount(el) {
  const fig = live.get(el);
  if (!fig || fig === 'loading') return;
  // The canvas gives the element its height: freeze it so removing the figure
  // doesn't shift the page (and the scroll position) under the reader.
  const h = el.offsetHeight;
  if (h) el.style.minHeight = `${h}px`;
  scheduler.remove(fig);
  try { fig.teardown(); } catch (err) {
    console.error(`Figure "${el.dataset.figure}" failed to tear down:`, err);
  }
  live.delete(el);
  el.classList.remove('is-live');
  // Figures append canvases, controls, and readouts; teardown() handles
  // listeners and GPU resources but some subclasses skip DOM removal. Sweep
  // everything a mount added (incl. the pause-button stage wrapper) so a
  // remount — far-scroll return or theme flip — never stacks duplicates.
  for (const kid of [...el.children]) if (!el.__origKids?.has(kid)) kid.remove();
}
