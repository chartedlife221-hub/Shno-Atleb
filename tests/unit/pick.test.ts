import { describe, expect, it } from 'bun:test';
import { ITEMS } from '../../src/data/items.ts';
import { greetingForHour, moodForHour, pickNext, poolFor } from '../../src/lib/pick.ts';
import { MOODS } from '../../src/lib/types.ts';

describe('mood picker', () => {
  it('only suggests items that fit the mood', () => {
    for (const mood of MOODS) for (const it of poolFor(ITEMS, mood)) expect(it.moods).toContain(mood);
    expect(poolFor(ITEMS, 'any')).toHaveLength(ITEMS.length);
  });

  it('never repeats the current item when there is a choice', () => {
    const pool = poolFor(ITEMS, 'wake');
    const current = pool[0]!;
    for (let i = 0; i < 50; i += 1) {
      expect(pickNext(pool, current.id, Math.random)?.id).not.toBe(current.id);
    }
  });

  it('is deterministic with an injected random source and stays in bounds', () => {
    const pool = poolFor(ITEMS, 'cold');
    expect(pickNext(pool, null, () => 0)).toEqual(pool[0]);
    expect(pickNext(pool, null, () => 0.999999)).toEqual(pool[pool.length - 1]);
    expect(pickNext(pool, null, () => 1)).toEqual(pool[pool.length - 1]);
  });

  it('handles empty and single-item pools', () => {
    expect(pickNext([], null)).toBeNull();
    const one = [ITEMS[0]!];
    expect(pickNext(one, ITEMS[0]!.id)).toEqual(ITEMS[0]);
  });

  it('chooses a default mood and greeting by time of day', () => {
    expect(moodForHour(7)).toBe('wake');
    expect(moodForHour(14)).toBe('cold');
    expect(moodForHour(19)).toBe('sweet');
    expect(moodForHour(2)).toBe('warm');
    expect(greetingForHour(8)).toBe('greetMorning');
    expect(greetingForHour(13)).toBe('greetNoon');
    expect(greetingForHour(20)).toBe('greetEvening');
    expect(greetingForHour(1)).toBe('greetNight');
  });
});
