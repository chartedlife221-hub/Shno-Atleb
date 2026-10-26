import { isKey, translate } from '../lib/i18n.ts';
import type { Lang } from '../lib/types.ts';

/** Fills every [data-i18n*] element from the dictionary. Text only: no HTML is ever parsed. */
export function applyI18n(root: ParentNode, lang: Lang): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = el.dataset['i18n'];
    if (key && isKey(key)) el.textContent = translate(lang, key);
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-placeholder]')) {
    const key = el.dataset['i18nPlaceholder'];
    if (key && isKey(key)) el.setAttribute('placeholder', translate(lang, key));
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-aria-label]')) {
    const key = el.dataset['i18nAriaLabel'];
    if (key && isKey(key)) el.setAttribute('aria-label', translate(lang, key));
  }
}
