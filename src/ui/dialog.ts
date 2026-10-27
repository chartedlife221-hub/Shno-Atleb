import { must } from '../lib/dom.ts';
import { translate } from '../lib/i18n.ts';
import { formatPrice, mapUrl, orderText } from '../lib/misc.ts';
import type { Lang, MenuItem } from '../lib/types.ts';
import { createHandoff, type HandoffPlayer } from './handoff.ts';
import { DATA_IS_DEMO } from '../data/items.ts';

export interface OrderDialog {
  /** `from` = the rectangle the card should grow out of (the cup the visitor touched). */
  open(item: MenuItem, lang: Lang, from?: DOMRect, sourceTime?: number): void;
  readonly handoff: HandoffPlayer;
}

/**
 * Three connected stages:
 *  1. the order card (exact name, café, price), grown out of the cup that was touched;
 *  2. the card becomes a window onto the café (background layer, clipped by the card);
 *  3. a real hand brings the drink forward out of the card (cut-out layer above the card).
 */
export function setupDialog(copy: (text: string) => void): OrderDialog {
  const dlg = must('#barista', HTMLDialogElement);
  const card = must('.barista__card', HTMLElement, dlg);
  const nameEn = must('#dlg-name', HTMLElement);
  const nameAr = must('#dlg-name-ar', HTMLElement);
  const cafe = must('#dlg-cafe', HTMLElement);
  const price = must('#dlg-price', HTMLElement);
  const note = must('#dlg-note', HTMLElement);
  const map = must('#dlg-map', HTMLAnchorElement);
  const shareBtn = must('#dlg-share', HTMLButtonElement);
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handoff = createHandoff({
    fg: must('#ho-fg', HTMLCanvasElement),
    bg: must('#ho-bg', HTMLCanvasElement),
    video: must('#ho-video', HTMLVideoElement),
    fgImg: must('#ho-fg-img', HTMLImageElement),
    bgImg: must('#ho-bg-img', HTMLImageElement),
    text: must('.barista__text', HTMLElement, dlg),
  });
  let current: { item: MenuItem; lang: Lang } | null = null;

  shareBtn.hidden = typeof navigator.share !== 'function';
  must('#dlg-close', HTMLButtonElement).addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  must('#dlg-copy', HTMLButtonElement).addEventListener('click', () => { if (current) copy(orderText(current.item, current.lang)); });
  shareBtn.addEventListener('click', () => {
    if (!current) return;
    const { item, lang } = current;
    const text = translate(lang, 'shareText', { name: item.name[lang], cafe: item.cafe[lang], area: translate(lang, `area_${item.area}`) });
    navigator.share({ title: item.name[lang], text }).catch(() => undefined);
  });
  dlg.addEventListener('close', () => {
    handoff.stop();
    card.classList.remove('is-scene', 'is-handoff', 'is-still');
    card.style.removeProperty('min-height');
    card.dataset['stage'] = '0';
  });

  /** Stage 1 entrance: the card grows out of the touched cup (FLIP). */
  const growFrom = (from: DOMRect): void => {
    if (calm.matches || typeof card.animate !== 'function') return;
    const to = card.getBoundingClientRect();
    if (to.width === 0) return;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const s = Math.min(from.width / to.width, from.height / to.height);
    card.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.4, borderRadius: '30px' },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 520, easing: 'cubic-bezier(.2, .9, .25, 1)' },
    );
  };

  return {
    handoff,
    open(item, lang, from, sourceTime) {
      if (dlg.open) return; // repeated taps never stack or restart the presentation
      current = { item, lang };
      nameEn.textContent = item.name.en;
      nameAr.textContent = item.name.ar;
      cafe.textContent = `${item.cafe[lang]} · ${translate(lang, `area_${item.area}`)}`;
      price.textContent = formatPrice(item.priceKwd, lang);
      map.href = mapUrl(item);
      must('#dlg-demo', HTMLElement).hidden = !DATA_IS_DEMO;
      const has = handoff.has(item);
      note.textContent = has ? '' : translate(lang, 'noFootage');
      note.hidden = has;
      card.classList.remove('is-scene', 'is-handoff', 'is-still');
      card.classList.toggle('has-footage', has);
      card.classList.toggle('is-tall', handoff.tall(item));
      if (!dlg.open) dlg.showModal();
      if (from) growFrom(from);
      card.dataset['stage'] = '1';
      handoff.play(item, card, (stage) => {
        card.dataset['stage'] = String(stage);
        if (stage === 2) {
          // grow from the card's current size (no shrink-then-grow when the text compacts)
          card.style.setProperty('transition', 'none');
          card.style.setProperty('min-height', `${card.getBoundingClientRect().height}px`);
          card.classList.add('is-scene');
          void card.offsetHeight;
          card.style.removeProperty('transition');
          requestAnimationFrame(() => card.style.removeProperty('min-height'));
        }
        if (stage === 3) card.classList.add('is-handoff');
      }, sourceTime);
    },
  };
}
