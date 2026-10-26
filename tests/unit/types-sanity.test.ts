import { describe, expect, it } from 'bun:test';
import { AREAS, CATEGORIES, MOODS } from '../../src/lib/types.ts';
import { ar } from '../../src/lib/dictionary.ts';

describe('every enum value has copy', () => {
  it('has labels for areas, categories, moods, badges and sources', () => {
    for (const a of AREAS) expect(Object.prototype.hasOwnProperty.call(ar, `area_${a}`)).toBe(true);
    for (const c of CATEGORIES) expect(Object.prototype.hasOwnProperty.call(ar, `cat_${c}`)).toBe(true);
    for (const m of MOODS) expect(Object.prototype.hasOwnProperty.call(ar, `mood_${m}`)).toBe(true);
    for (const b of ['most_ordered', 'staff_pick', 'cult_favorite', 'local_favorite']) expect(Object.prototype.hasOwnProperty.call(ar, `badge_${b}`)).toBe(true);
    for (const s of ['staff_interview', 'delivery_app_ranking', 'community_submission']) expect(Object.prototype.hasOwnProperty.call(ar, `src_${s}`)).toBe(true);
  });
});
