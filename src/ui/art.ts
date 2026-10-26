import { svg } from '../lib/dom.ts';
import type { MenuItem } from '../lib/types.ts';

/** Draws a drink or dessert from the four layer colors of an item. Decorative only. */
export function drinkArt(item: MenuItem): SVGSVGElement {
  const [a, b, c, d] = item.layers;
  const root = svg('svg', { class: 'art', attrs: { viewBox: '0 0 120 120', 'aria-hidden': 'true', focusable: 'false' } });
  const add = (...nodes: SVGElement[]): void => {
    for (const n of nodes) root.appendChild(n);
  };
  const ink = { 'stroke': 'var(--art-line)', 'stroke-width': 2, 'stroke-linejoin': 'round' } as const;

  if (item.category === 'cake_dessert') {
    add(
      svg('ellipse', { attrs: { cx: 60, cy: 100, rx: 48, ry: 8, fill: 'var(--art-line)', opacity: 0.18 } }),
      svg('path', { attrs: { d: 'M16 78 L104 78 L104 94 Q60 104 16 94 Z', fill: d, ...ink } }),
      svg('path', { attrs: { d: 'M16 62 L104 62 L104 78 L16 78 Z', fill: c, ...ink } }),
      svg('path', { attrs: { d: 'M16 46 L104 46 L104 62 L16 62 Z', fill: b, ...ink } }),
      svg('path', { attrs: { d: 'M16 46 Q22 28 60 28 Q98 28 104 46 Z', fill: a, ...ink } }),
      svg('circle', { attrs: { cx: 60, cy: 24, r: 7, fill: 'var(--rose)', ...ink } }),
    );
    return root;
  }
  if (item.category === 'hot_coffee') {
    add(
      svg('ellipse', { attrs: { cx: 58, cy: 104, rx: 44, ry: 7, fill: 'var(--art-line)', opacity: 0.18 } }),
      svg('path', { attrs: { d: 'M94 52 Q116 52 116 70 Q116 88 92 88', fill: 'none', ...ink } }),
      svg('path', { attrs: { d: 'M14 46 L98 46 L92 88 Q88 102 70 102 L42 102 Q24 102 20 88 Z', fill: c, ...ink } }),
      svg('ellipse', { attrs: { cx: 56, cy: 46, rx: 42, ry: 10, fill: a, ...ink } }),
      svg('ellipse', { attrs: { cx: 56, cy: 46, rx: 24, ry: 5, fill: b, opacity: 0.8 } }),
      svg('path', { attrs: { d: 'M44 30 Q38 20 46 12 M64 30 Q58 20 66 12', fill: 'none', stroke: 'var(--art-line)', 'stroke-width': 2, 'stroke-linecap': 'round' } }),
    );
    return root;
  }
  // iced coffee, specialty latte, matcha and other: a tall cup with layers, lid and straw
  add(
    svg('ellipse', { attrs: { cx: 60, cy: 112, rx: 30, ry: 5, fill: 'var(--art-line)', opacity: 0.18 } }),
    svg('path', { attrs: { d: 'M66 6 L74 6 L70 34', fill: 'none', ...ink, 'stroke-linecap': 'round' } }),
    svg('path', { attrs: { d: 'M26 34 L94 34 L86 106 Q85 112 78 112 L42 112 Q35 112 34 106 Z', fill: 'var(--paper)', ...ink } }),
    svg('path', { attrs: { d: 'M29 48 L91 48 L88 66 L32 66 Z', fill: b } }),
    svg('path', { attrs: { d: 'M32 66 L88 66 L85 86 L35 86 Z', fill: c } }),
    svg('path', { attrs: { d: 'M35 86 L85 86 L83.5 104 Q83 108 78 108 L42 108 Q37 108 36.5 104 Z', fill: d } }),
    svg('path', { attrs: { d: 'M28 34 L92 34 L90 48 L30 48 Z', fill: a } }),
    svg('path', { attrs: { d: 'M26 34 L94 34 L86 106 Q85 112 78 112 L42 112 Q35 112 34 106 Z', fill: 'none', ...ink } }),
    svg('rect', { attrs: { x: 22, y: 26, width: 76, height: 10, rx: 5, fill: 'var(--art-line)' } }),
    svg('path', { attrs: { d: 'M40 56 L42 98', stroke: '#fff', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.45, fill: 'none' } }),
  );
  return root;
}
