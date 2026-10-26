import { h, svg } from '../lib/dom.ts';
import { formatPrice } from '../lib/misc.ts';
import type { Lang, MenuItem } from '../lib/types.ts';

const reduced = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The hero cup: kraft body, a sadu-pattern sleeve and an order "handwritten" on it. */
export interface Cup {
  readonly el: HTMLElement;
  write(item: MenuItem, lang: Lang): void;
}

function sadu(): SVGSVGElement {
  const root = svg('svg', { class: 'cup__sadu', attrs: { viewBox: '0 0 200 14', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' } });
  for (let i = 0; i < 10; i += 1) {
    root.appendChild(svg('path', { attrs: { d: `M${i * 20} 14 L${i * 20 + 10} 0 L${i * 20 + 20} 14 Z`, fill: i % 2 ? 'var(--sun)' : 'var(--paper)' } }));
  }
  return root;
}

export function createCup(): Cup {
  const name = h('span', { class: 'cup__name' });
  const cafe = h('span', { class: 'cup__cafe' });
  const price = h('span', { class: 'cup__price' });
  const label = h('div', { class: 'cup__label', attrs: { 'aria-hidden': 'true' } }, name, cafe, price);
  const live = h('span', { class: 'sr-only' });
  const body = h(
    'div',
    { class: 'cup__body' },
    h('div', { class: 'cup__lid' }),
    h('div', { class: 'cup__sleeve' }, sadu(), label, sadu()),
  );
  const steam = h('div', { class: 'cup__steam', attrs: { 'aria-hidden': 'true' } }, h('i'), h('i'), h('i'));
  const el = h('div', { class: 'cup', attrs: { role: 'img' } }, steam, h('div', { class: 'cup__shape' }, body), live);

  let token = 0;
  const type = (target: HTMLElement, text: string, done?: () => void): void => {
    const my = token;
    if (reduced()) {
      target.textContent = text;
      done?.();
      return;
    }
    const chars = Array.from(text);
    let i = 0;
    target.textContent = '';
    const tick = (): void => {
      if (my !== token) return;
      i += 1;
      target.textContent = chars.slice(0, i).join('');
      if (i < chars.length) window.setTimeout(tick, 34);
      else done?.();
    };
    tick();
  };

  // Pointer tilt (skipped when the user prefers reduced motion).
  el.addEventListener('pointermove', (e) => {
    if (reduced()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    body.style.setProperty('--tilt-x', `${(-y * 8).toFixed(2)}deg`);
    body.style.setProperty('--tilt-y', `${(x * 10).toFixed(2)}deg`);
  });
  el.addEventListener('pointerleave', () => {
    body.style.setProperty('--tilt-x', '0deg');
    body.style.setProperty('--tilt-y', '0deg');
  });

  return {
    el,
    write(item, lang) {
      token += 1;
      const my = token;
      const summary = `${item.name[lang]} — ${item.cafe[lang]} — ${formatPrice(item.priceKwd, lang)}`;
      el.setAttribute('aria-label', summary);
      live.textContent = '';
      body.classList.remove('is-writing');
      void body.offsetWidth; // restart the CSS bounce
      body.classList.add('is-writing');
      cafe.textContent = '';
      price.textContent = '';
      type(name, item.name[lang], () => {
        if (my !== token) return;
        cafe.textContent = item.cafe[lang];
        price.textContent = formatPrice(item.priceKwd, lang);
      });
    },
  };
}
