// @ts-check
// Base lifecycle every figure extends. The runtime calls init/onResize/onVisible/
// onHidden/teardown; the scheduler calls update/draw for animated figures.

export class Figure {
  /**
   * @param {HTMLElement} root  the <figure> mount point
   * @param {object} services   { scheduler, makeControls, palette }
   */
  constructor(root, services) {
    this.root = root;
    this.services = services;
    this.params = {};
    /** 'static' = redraw on input/resize; 'animated' = driven by the scheduler while visible. */
    this.mode = 'static';
  }

  init() {}
  onResize() {}
  update(_dt) {}
  draw() {}
  onChange(_name, _value) { this.draw(); }
  onVisible() {}
  onHidden() {}
  teardown() {}

  /** Ask the scheduler to redraw this static figure once. */
  requestDraw() { this.services.scheduler.requestDraw(this); }
}
