import type { MenuItem, MoodChoice } from './types.ts';

export type Rng = () => number;

/** Items that fit a mood. 'any' means everything. */
export function poolFor(items: readonly MenuItem[], mood: MoodChoice): MenuItem[] {
  return mood === 'any' ? [...items] : items.filter((it) => it.moods.includes(mood));
}

/**
 * Picks a random item from the pool, never the one currently shown (when there is a choice).
 * `rng` is injectable so tests are deterministic.
 */
export function pickNext(pool: readonly MenuItem[], currentId: string | null, rng: Rng = Math.random): MenuItem | null {
  if (pool.length === 0) return null;
  const options = pool.length > 1 ? pool.filter((it) => it.id !== currentId) : [...pool];
  const index = Math.min(options.length - 1, Math.floor(rng() * options.length));
  return options[index] ?? null;
}

/** A sensible default mood for the time of day (local hour, 0-23). */
export function moodForHour(hour: number): MoodChoice {
  if (hour >= 5 && hour < 11) return 'wake';
  if (hour >= 11 && hour < 17) return 'cold';
  if (hour >= 17 && hour < 22) return 'sweet';
  return 'warm';
}

export type Greeting = 'greetMorning' | 'greetNoon' | 'greetEvening' | 'greetNight';

export function greetingForHour(hour: number): Greeting {
  if (hour >= 5 && hour < 12) return 'greetMorning';
  if (hour >= 12 && hour < 17) return 'greetNoon';
  if (hour >= 17 && hour < 22) return 'greetEvening';
  return 'greetNight';
}
