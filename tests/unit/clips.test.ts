import { describe, expect, it } from 'bun:test';
import { ITEMS } from '../../src/data/items.ts';
import { clipFor } from '../../src/ui/clips.ts';

describe('footage always matches the ordered drink', () => {
  it('uses the printed iced clip only for the Iced Vanilla Americano', () => {
    for (const it of ITEMS) {
      if (clipFor(it)?.id === 'iced') expect(it.id).toBe('iced-vanilla-americano');
    }
  });
  it('uses the iced Spanish latte glass only for that order', () => {
    for (const it of ITEMS) {
      if (clipFor(it)?.id === 'spanish') expect(it.id).toBe('iced-spanish-latte');
    }
    expect(clipFor(ITEMS.find((i) => i.id === 'iced-spanish-latte')!)?.id).toBe('spanish');
  });
  it('uses the frappuccino glass only for the Caramel Frappuccino', () => {
    for (const it of ITEMS) if (clipFor(it)?.id === 'frappe') expect(it.id).toBe('caramel-frappuccino');
    expect(clipFor(ITEMS.find((i) => i.id === 'caramel-frappuccino')!)?.id).toBe('frappe');
  });
  it('uses the white takeaway cup only for hot drinks, never for iced drinks or desserts', () => {
    for (const it of ITEMS) {
      if (clipFor(it)?.id !== 'hot') continue;
      expect(it.category).not.toBe('cake_dessert');
      expect(it.moods).toContain('warm');
      expect(it.name.en.toLowerCase()).not.toContain('iced');
    }
  });
  it('has footage for several drinks', () => {
    expect(ITEMS.filter((it) => clipFor(it) !== null).length).toBeGreaterThan(5);
  });
});
