import { ar, en, type Key } from './dictionary.ts';
import type { Lang } from './types.ts';

const DICTIONARIES: Record<Lang, Record<Key, string>> = { ar, en };

export type Vars = Readonly<Record<string, string | number>>;

/** Looks up a key and fills {placeholders}. Unknown placeholders are left untouched. */
export function translate(lang: Lang, key: Key, vars?: Vars): string {
  const template = DICTIONARIES[lang][key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = vars[name];
    return value === undefined ? whole : String(value);
  });
}

export function isKey(value: string): value is Key {
  return Object.prototype.hasOwnProperty.call(ar, value);
}

export function isLang(value: unknown): value is Lang {
  return value === 'ar' || value === 'en';
}

export function directionOf(lang: Lang): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

/** Arabic first, as per the brand brief. A stored choice wins. */
export function initialLang(stored: string | null): Lang {
  return isLang(stored) ? stored : 'ar';
}
