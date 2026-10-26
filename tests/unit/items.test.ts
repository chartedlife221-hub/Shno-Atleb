import { describe, expect, it } from 'bun:test';
import { ITEMS } from '../../src/data/items.ts';
import { AREAS, BADGES, CATEGORIES, MOODS, SOURCES } from '../../src/lib/types.ts';
import { isIsoDate } from '../../src/lib/freshness.ts';

describe('item data follows the schema rules', () => {
  it('has 20 to 30 curated items with unique ids', () => {
    expect(ITEMS.length).toBeGreaterThanOrEqual(20);
    expect(ITEMS.length).toBeLessThanOrEqual(30);
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
  });

  it('uses only known enum values', () => {
    for (const it of ITEMS) {
      expect(AREAS).toContain(it.area);
      expect(CATEGORIES).toContain(it.category);
      expect(BADGES).toContain(it.badge);
      expect(SOURCES).toContain(it.source);
      for (const m of it.moods) expect(MOODS).toContain(m);
      expect(it.moods.length).toBeGreaterThan(0);
    }
  });

  it('never publishes an item without a source and a valid verification date', () => {
    for (const it of ITEMS) {
      expect(it.source).toBeTruthy();
      expect(isIsoDate(it.dateVerified)).toBe(true);
    }
  });

  it('has prices with at most 3 decimals and in a sane range', () => {
    for (const it of ITEMS) {
      expect(Math.round(it.priceKwd * 1000) / 1000).toBe(it.priceKwd);
      expect(it.priceKwd).toBeGreaterThan(0);
      expect(it.priceKwd).toBeLessThan(20);
    }
  });

  it('has bilingual names, cafés and one-line reasons', () => {
    for (const it of ITEMS) {
      for (const field of [it.name, it.cafe, it.reason]) {
        expect(field.ar.length).toBeGreaterThan(1);
        expect(field.en.length).toBeGreaterThan(1);
      }
      expect(it.reason.ar).not.toContain('\n');
    }
  });

  it('has four valid hex layer colors', () => {
    for (const it of ITEMS) {
      expect(it.layers).toHaveLength(4);
      for (const c of it.layers) expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('has a unique Top 10 ranking from 1 to 10', () => {
    const ranks = ITEMS.map((i) => i.topRank).filter((r): r is number => r !== undefined).sort((a, b) => a - b);
    expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('covers every area and category', () => {
    expect(new Set(ITEMS.map((i) => i.area)).size).toBe(AREAS.length);
    expect(new Set(ITEMS.map((i) => i.category)).size).toBe(CATEGORIES.length);
  });

  it('has at least 3 items for every mood so the picker always has choice', () => {
    for (const mood of MOODS) expect(ITEMS.filter((i) => i.moods.includes(mood)).length).toBeGreaterThanOrEqual(3);
  });

  it('never uses "official" best-seller claims (brand rule)', () => {
    for (const it of ITEMS) {
      const text = JSON.stringify([it.reason, it.name]).toLowerCase();
      expect(text).not.toContain('official');
      expect(text).not.toContain('رسمي');
    }
  });
});
