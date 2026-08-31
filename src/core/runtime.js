// @ts-check
// Lazy-mounts figures on scroll approach and pauses them when they leave the
// viewport. One IntersectionObserver for the whole page. Animated figures also
// get their own pause button in the top-right corner of the animation.
import { registry } from './registry.js';
import { scheduler } from './scheduler.js';

const live = new Map(); // element -> figure instance
const REDUCE = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const PAUSE_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
const PLAY_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';

const io = new IntersectionObserver(onIntersect, { rootMargin: '200px 0px', threshold: 0 });

/** Observe every [data-figure] mount point on the page. */
export function mountAll(services) {
  document.querySelectorAll('[data-figure]').forEach((el) => {
    el.__services = services;
    io.observe(el);
  });
}

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

async function onIntersect(entries) {
  for (const e of entries) {
    const el = /** @type {HTMLElement} */ (e.target);
    if (e.isIntersecting) {
      if (!live.has(el)) {
        const load = registry[el.dataset.figure];
        if (!load) continue;
        live.set(el, 'loading'); // guard against double-mount
        try {
          const mod = await load();
          const fig = new mod.default(el, el.__services);
          live.set(el, fig);
          el.classList.add('is-live');
          await fig.init();
          fig.onVisible();
          if (fig.mode === 'animated') {
            if (REDUCE) fig._paused = true; // honor reduced-motion: start held
            scheduler.add(fig);
            addPauseButton(el, fig);
          }
        } catch (err) {
          console.error(`Figure "${el.dataset.figure}" failed to mount:`, err);
          live.delete(el);
          el.classList.add('fig--error');
        }
      } else {
        const fig = live.get(el);
        if (fig && fig !== 'loading') {
          fig.onVisible();
          if (fig.mode === 'animated') scheduler.add(fig);
        }
      }
    } else {
      const fig = live.get(el);
      if (fig && fig !== 'loading') {
        scheduler.remove(fig);
        fig.onHidden();
      }
    }
  }
}
