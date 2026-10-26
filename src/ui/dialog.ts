import { must } from '../lib/dom.ts';
import { formatPrice, mapUrl, orderText } from '../lib/misc.ts';
import { translate } from '../lib/i18n.ts';
import type { Lang, MenuItem } from '../lib/types.ts';

export interface OrderDialog {
  open(item: MenuItem, lang: Lang): void;
}

/** Full-screen "show the barista" card on top of a native <dialog> (focus trap + Esc for free). */
export function setupDialog(copy: (text: string) => void): OrderDialog {
  const dlg = must('#barista', HTMLDialogElement);
  const nameEn = must('#dlg-name', HTMLElement);
  const nameAr = must('#dlg-name-ar', HTMLElement);
  const cafe = must('#dlg-cafe', HTMLElement);
  const price = must('#dlg-price', HTMLElement);
  const map = must('#dlg-map', HTMLAnchorElement);
  const shareBtn = must('#dlg-share', HTMLButtonElement);
  let current: { item: MenuItem; lang: Lang } | null = null;

  const canShare = typeof navigator.share === 'function';
  shareBtn.hidden = !canShare;

  must('#dlg-close', HTMLButtonElement).addEventListener('click', () => dlg.close());
  // A click on the backdrop targets the dialog element itself.
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
  must('#dlg-copy', HTMLButtonElement).addEventListener('click', () => {
    if (current) copy(orderText(current.item, current.lang));
  });
  shareBtn.addEventListener('click', () => {
    if (!current) return;
    const { item, lang } = current;
    const text = translate(lang, 'shareText', { name: item.name[lang], cafe: item.cafe[lang], area: translate(lang, `area_${item.area}`) });
    navigator.share({ title: item.name[lang], text }).catch(() => undefined);
  });

  return {
    open(item, lang) {
      current = { item, lang };
      nameEn.textContent = item.name.en;
      nameAr.textContent = item.name.ar;
      cafe.textContent = `${item.cafe[lang]} · ${translate(lang, `area_${item.area}`)}`;
      price.textContent = formatPrice(item.priceKwd, lang);
      map.href = mapUrl(item);
      if (!dlg.open) dlg.showModal();
    },
  };
}
