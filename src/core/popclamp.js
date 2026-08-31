// @ts-check
// Glossary/entity popups are absolutely positioned off an inline term, so a
// term near the column edge would push its popup past the viewport — clipped
// by the overflow-x on <body>. On open, measure the popup and set --pop-shift
// (consumed in nav.css) to slide it back fully into view.

const MARGIN = 10; // px between an open popup and the viewport edge

/**
 * @param {HTMLElement} trigger inline term the popup hangs off
 * @param {HTMLElement} pop the popup element itself
 */
export function attachPopClamp(trigger, pop) {
  const clamp = () => {
    trigger.style.setProperty('--pop-shift', '0px');
    const r = pop.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    let shift = 0;
    if (r.left < MARGIN) shift = MARGIN - r.left;
    else if (r.right > vw - MARGIN) shift = vw - MARGIN - r.right;
    if (shift) trigger.style.setProperty('--pop-shift', `${shift}px`);
  };
  trigger.addEventListener('pointerenter', clamp);
  trigger.addEventListener('focusin', clamp);
}
