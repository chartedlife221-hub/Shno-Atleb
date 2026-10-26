import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { ar, en } from '../../src/lib/dictionary.ts';
import { directionOf, initialLang, translate } from '../../src/lib/i18n.ts';
import { formatPrice, mapUrl, orderText } from '../../src/lib/misc.ts';
import { ITEMS } from '../../src/data/items.ts';

describe('dictionary', () => {
  it('has identical keys in Arabic and English and no empty strings', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ar).sort());
    for (const v of [...Object.values(ar), ...Object.values(en)]) expect(v.length).toBeGreaterThan(0);
  });

  it('uses the same placeholders in both languages', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const k of Object.keys(ar) as (keyof typeof ar)[]) expect(ph(en[k])).toBe(ph(ar[k]));
  });

  it('covers every data-i18n key used in index.html', () => {
    const html = readFileSync('index.html', 'utf8');
    const keys = [...html.matchAll(/data-i18n(?:-[a-z-]+)?="(\w+)"/g)].map((m) => m[1]!);
    expect(keys.length).toBeGreaterThan(10);
    for (const k of keys) expect(Object.prototype.hasOwnProperty.call(ar, k)).toBe(true);
  });

  it('keeps the brand rule: never an "official best seller" claim in either language', () => {
    const all = [...Object.values(ar), ...Object.values(en)].join(' ').toLowerCase();
    expect(all).not.toContain('official best');
  });
});

describe('translate + helpers', () => {
  it('fills placeholders and leaves unknown ones', () => {
    expect(translate('en', 'countMany', { n: 5 })).toBe('5 orders');
    expect(translate('ar', 'countMany', { n: 5 })).toBe('5 طلب');
    expect(translate('en', 'countMany')).toBe('{n} orders');
  });
  it('picks direction and initial language (Arabic first)', () => {
    expect(directionOf('ar')).toBe('rtl');
    expect(directionOf('en')).toBe('ltr');
    expect(initialLang(null)).toBe('ar');
    expect(initialLang('en')).toBe('en');
    expect(initialLang('fr')).toBe('ar');
  });
  it('formats prices with 3 decimals and the right currency', () => {
    expect(formatPrice(1.6, 'en')).toBe('1.600 KD');
    expect(formatPrice(1.6, 'ar')).toBe('1.600 د.ك');
  });
  it('builds safe https map links and shareable order text', () => {
    const item = ITEMS[0]!;
    expect(mapUrl(item).startsWith('https://www.google.com/maps/search/?api=1&query=')).toBe(true);
    expect(orderText(item, 'en')).toContain(item.name.en);
    expect(orderText(item, 'ar')).toContain(item.name.ar);
  });
});
