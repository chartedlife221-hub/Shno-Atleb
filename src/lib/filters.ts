import type { AreaId, CategoryId, MenuItem, PriceBand } from './types.ts';

export interface Filters {
  readonly query: string;
  readonly category: CategoryId | 'all';
  readonly area: AreaId | 'all';
  /** English café name, or 'all'. */
  readonly cafe: string;
  readonly price: PriceBand | 'all';
}

export const NO_FILTERS: Filters = { query: '', category: 'all', area: 'all', cafe: 'all', price: 'all' };

export function priceBand(priceKwd: number): PriceBand {
  if (priceKwd < 1.5) return 'low';
  if (priceKwd <= 2.0) return 'mid';
  return 'high';
}

/**
 * Makes search forgiving for Arabic typing: strips diacritics and tatweel, unifies alef,
 * ya and ta marbuta variants, maps Arabic-Indic digits to Latin, and lowercases Latin text.
 */
export function normalizeText(input: string): string {
  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesQuery(item: MenuItem, query: string): boolean {
  const q = normalizeText(query);
  if (q === '') return true;
  const haystack = normalizeText(
    [item.name.ar, item.name.en, item.cafe.ar, item.cafe.en, item.reason.ar, item.reason.en].join(' '),
  );
  return q.split(' ').every((word) => haystack.includes(word));
}

export function applyFilters(items: readonly MenuItem[], f: Filters): MenuItem[] {
  return items.filter(
    (it) =>
      (f.category === 'all' || it.category === f.category) &&
      (f.area === 'all' || it.area === f.area) &&
      (f.cafe === 'all' || it.cafe.en === f.cafe) &&
      (f.price === 'all' || priceBand(it.priceKwd) === f.price) &&
      matchesQuery(it, f.query),
  );
}

export function uniqueCafes(items: readonly MenuItem[]): { en: string; ar: string }[] {
  const seen = new Map<string, string>();
  for (const it of items) if (!seen.has(it.cafe.en)) seen.set(it.cafe.en, it.cafe.ar);
  return [...seen.entries()].map(([en, ar]) => ({ en, ar })).sort((a, b) => a.en.localeCompare(b.en));
}

export function countByArea(items: readonly MenuItem[]): Record<AreaId, number> {
  const counts = {
    salmiya: 0, 'kuwait-city': 0, jabriya: 0, hawally: 0, salwa: 0, fintas: 0, ahmadi: 0, farwaniya: 0,
  } satisfies Record<AreaId, number>;
  for (const it of items) counts[it.area] += 1;
  return counts;
}
