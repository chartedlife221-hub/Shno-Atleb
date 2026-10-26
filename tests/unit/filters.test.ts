import { describe, expect, it } from 'bun:test';
import { ITEMS } from '../../src/data/items.ts';
import { applyFilters, countByArea, matchesQuery, NO_FILTERS, normalizeText, priceBand, uniqueCafes } from '../../src/lib/filters.ts';

describe('filters', () => {
  it('returns everything with no filters', () => {
    expect(applyFilters(ITEMS, NO_FILTERS)).toHaveLength(ITEMS.length);
  });

  it('bands prices at the documented edges', () => {
    expect(priceBand(1.499)).toBe('low');
    expect(priceBand(1.5)).toBe('mid');
    expect(priceBand(2.0)).toBe('mid');
    expect(priceBand(2.001)).toBe('high');
  });

  it('combines category, area, café and price filters', () => {
    const res = applyFilters(ITEMS, { ...NO_FILTERS, category: 'matcha_other', area: 'kuwait-city' });
    expect(res.length).toBeGreaterThan(0);
    for (const it of res) {
      expect(it.category).toBe('matcha_other');
      expect(it.area).toBe('kuwait-city');
    }
    const cafe = applyFilters(ITEMS, { ...NO_FILTERS, cafe: 'Starbucks' });
    for (const it of cafe) expect(it.cafe.en).toBe('Starbucks');
  });

  it('finds items by English and Arabic text, forgiving of Arabic spelling variants', () => {
    expect(applyFilters(ITEMS, { ...NO_FILTERS, query: 'spanish' }).length).toBeGreaterThan(0);
    expect(applyFilters(ITEMS, { ...NO_FILTERS, query: 'سبانش' }).length).toBeGreaterThan(0);
    // ة/ه and أ/ا variants should still match
    expect(normalizeText('أمريكانو')).toBe(normalizeText('امريكانو'));
    expect(normalizeText('محمصة')).toBe(normalizeText('محمصه'));
    expect(applyFilters(ITEMS, { ...NO_FILTERS, query: 'امريكانو' }).length).toBeGreaterThan(0);
  });

  it('matches all words in a multi-word query, in any order', () => {
    const item = ITEMS[0]!;
    expect(matchesQuery(item, `${item.cafe.en.split(' ')[0]} ${item.name.en.split(' ')[0]}`.toUpperCase())).toBe(true);
    expect(matchesQuery(item, 'zzzz-nothing')).toBe(false);
  });

  it('maps Arabic-Indic digits so "٣ سكوبات" is searchable with "3"', () => {
    expect(applyFilters(ITEMS, { ...NO_FILTERS, query: '3 سكوبات' }).length).toBeGreaterThan(0);
  });

  it('counts items per area and lists unique cafés', () => {
    const counts = countByArea(ITEMS);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(ITEMS.length);
    const cafes = uniqueCafes(ITEMS);
    expect(new Set(cafes.map((c) => c.en)).size).toBe(cafes.length);
  });
});
