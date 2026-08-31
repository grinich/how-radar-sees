// @ts-check
// Accessible control factory. Every control is a real, keyboard-operable native
// element with an aria label and a live value read-out — directly fixing the
// unfocusable <div> sliders that Ciechanowski's figures were criticized for.

const fmt = (c, v) => (c.format ? c.format(v) : String(v));

/**
 * Build a control panel from a declarative schema.
 * @param {Array<object>} schema
 * @param {(name: string, value: any) => void} onChange
 * @returns {HTMLElement}
 */
export function makeControls(schema, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'fig__controls';

  for (const c of schema) {
    if (c.type === 'range') {
      const row = document.createElement('label');
      row.className = 'ctl';
      const label = document.createElement('span');
      label.className = 'ctl__label';
      label.textContent = c.label;
      const input = document.createElement('input');
      Object.assign(input, { type: 'range', min: c.min, max: c.max, step: c.step, value: c.value });
      input.setAttribute('aria-label', c.label);
      const out = document.createElement('output');
      out.className = 'ctl__val';
      out.textContent = fmt(c, c.value);
      input.setAttribute('aria-valuetext', out.textContent);
      input.addEventListener('input', () => {
        const val = +input.value;
        out.textContent = fmt(c, val);
        input.setAttribute('aria-valuetext', out.textContent);
        onChange(c.name, val);
      });
      row.append(label, input, out);
      wrap.append(row);

    } else if (c.type === 'segmented') {
      const group = document.createElement('div');
      group.className = 'ctl ctl--seg';
      group.setAttribute('role', 'radiogroup');
      group.setAttribute('aria-label', c.label);
      const label = document.createElement('span');
      label.className = 'ctl__label';
      label.textContent = c.label;
      const seg = document.createElement('div');
      seg.className = 'seg';
      for (const [name, value] of c.options) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'seg__btn';
        btn.textContent = name;
        btn.setAttribute('role', 'radio');
        const selected = value === c.value;
        btn.setAttribute('aria-checked', String(selected));
        if (selected) btn.classList.add('is-active');
        btn.addEventListener('click', (e) => {
          seg.querySelectorAll('.seg__btn').forEach((b) => {
            b.classList.remove('is-active');
            b.setAttribute('aria-checked', 'false');
          });
          btn.classList.add('is-active');
          btn.setAttribute('aria-checked', 'true');
          onChange(c.name, value);
          // Drop the focus ring after a real pointer click (detail>0); keyboard
          // activation (detail===0) keeps it, so keyboard users still see focus.
          if (e.detail !== 0) btn.blur();
        });
        seg.append(btn);
      }
      group.append(label, seg);
      wrap.append(group);

    } else if (c.type === 'toggle') {
      const row = document.createElement('label');
      row.className = 'ctl ctl--toggle';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!c.value;
      input.setAttribute('aria-label', c.label);
      const label = document.createElement('span');
      label.className = 'ctl__label';
      label.textContent = c.label;
      input.addEventListener('change', () => onChange(c.name, input.checked));
      row.append(input, label);
      wrap.append(row);
    }
  }
  return wrap;
}

/** Extract the default param values from a schema. */
export function defaultsFrom(schema) {
  const out = {};
  for (const c of schema) out[c.name] = c.value;
  return out;
}
