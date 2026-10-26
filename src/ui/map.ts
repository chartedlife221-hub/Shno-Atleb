import { h, svg } from '../lib/dom.ts';
import { translate } from '../lib/i18n.ts';
import { countByArea } from '../lib/filters.ts';
import { AREAS, type AreaId, type Lang, type MenuItem } from '../lib/types.ts';

/** Approximate positions on the stylised map, in percent of its box (x from left, y from top). */
const POS: Record<AreaId, readonly [number, number]> = {
  'kuwait-city': [66, 24],
  hawally: [62, 40],
  salmiya: [72, 44],
  jabriya: [64, 52],
  farwaniya: [48, 46],
  salwa: [70, 60],
  ahmadi: [52, 72],
  fintas: [62, 82],
};

function land(): SVGSVGElement {
  return svg(
    'svg',
    { class: 'map__land', attrs: { viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' } },
    svg('path', { attrs: { d: 'M0 0 H100 V100 H0 Z', fill: 'var(--sea)' } }),
    svg('path', { attrs: { d: 'M0 14 Q22 8 40 16 Q54 14 62 18 L74 22 Q84 26 78 34 L80 46 Q88 52 82 62 L80 76 Q76 90 68 100 L0 100 Z', fill: 'var(--sand)', stroke: 'var(--ink)', 'stroke-width': 0.6, 'stroke-linejoin': 'round' } }),
    svg('circle', { attrs: { cx: 88, cy: 20, r: 3, fill: 'var(--sand)', stroke: 'var(--ink)', 'stroke-width': 0.5 } }),
    svg('circle', { attrs: { cx: 93, cy: 30, r: 1.6, fill: 'var(--sand)', stroke: 'var(--ink)', 'stroke-width': 0.5 } }),
  );
}

export function renderMap(host: HTMLElement, items: readonly MenuItem[], lang: Lang, onPick: (area: AreaId) => void): void {
  const counts = countByArea(items);
  host.replaceChildren(land(), h('span', { class: 'map__sea' }, translate(lang, 'mapSea')));
  for (const area of AREAS) {
    const [x, y] = POS[area];
    const name = translate(lang, `area_${area}`);
    const pin = h(
      'button',
      {
        class: 'pin',
        attrs: { type: 'button', 'aria-label': translate(lang, 'areaPinAria', { area: name, count: counts[area] }) },
        on: { click: () => onPick(area) },
      },
      h('span', { class: 'pin__n', attrs: { 'aria-hidden': 'true' } }, counts[area]),
      h('span', { class: 'pin__t', attrs: { 'aria-hidden': 'true' } }, name),
    );
    pin.style.setProperty('--x', `${x}%`);
    pin.style.setProperty('--y', `${y}%`);
    host.appendChild(pin);
  }
}
