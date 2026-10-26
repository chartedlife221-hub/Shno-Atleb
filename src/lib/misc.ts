import type { Lang, MenuItem } from './types.ts';
import { translate } from './i18n.ts';

/** "1.750 KD" / "1.750 د.ك". Always 3 decimals, Latin digits for consistency. */
export function formatPrice(priceKwd: number, lang: Lang): string {
  return `${priceKwd.toFixed(3)} ${translate(lang, 'currency')}`;
}

export function formatDate(iso: string, lang: Lang): string {
  const date = new Date(`${iso}T00:00:00Z`);
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : 'en-GB';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

/** Google Maps *search* link built from café + area names (no per-branch data yet). */
export function mapUrl(item: MenuItem): string {
  const query = `${item.cafe.en} ${item.area.replace('-', ' ')} Kuwait`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** The text a customer copies or shows: Arabic and English forms of the exact order. */
export function orderText(item: MenuItem, lang: Lang): string {
  const primary = item.name[lang];
  const secondary = item.name[lang === 'ar' ? 'en' : 'ar'];
  return `${primary} (${secondary}) — ${item.cafe[lang]}`;
}

export function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage can be unavailable (private mode, blocked): the app works without it */
  }
}

/** Copies text. Resolves false when the Clipboard API is unavailable or denied. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export interface Store<T> {
  get(): T;
  set(next: T): void;
  subscribe(fn: (value: T) => void): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const subscribers = new Set<(v: T) => void>();
  return {
    get: () => value,
    set(next) {
      value = next;
      for (const fn of subscribers) fn(value);
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}
