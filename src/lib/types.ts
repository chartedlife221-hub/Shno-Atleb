export const LANGS = ['ar', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const AREAS = [
  'salmiya',
  'kuwait-city',
  'jabriya',
  'hawally',
  'salwa',
  'fintas',
  'ahmadi',
  'farwaniya',
] as const;
export type AreaId = (typeof AREAS)[number];

export const CATEGORIES = [
  'iced_coffee',
  'hot_coffee',
  'specialty_latte',
  'matcha_other',
  'cake_dessert',
] as const;
export type CategoryId = (typeof CATEGORIES)[number];

export const BADGES = ['most_ordered', 'staff_pick', 'cult_favorite', 'local_favorite'] as const;
export type BadgeId = (typeof BADGES)[number];

export const SOURCES = ['staff_interview', 'delivery_app_ranking', 'community_submission'] as const;
export type SourceId = (typeof SOURCES)[number];

export const MOODS = ['cold', 'warm', 'sweet', 'wake', 'nocoffee', 'treat'] as const;
export type MoodId = (typeof MOODS)[number];
export type MoodChoice = MoodId | 'any';

export interface Bilingual {
  readonly ar: string;
  readonly en: string;
}

/** Four hex colors, top layer to bottom layer. Used to draw the drink or dessert. */
export type Layers = readonly [string, string, string, string];

export interface MenuItem {
  readonly id: string;
  readonly name: Bilingual;
  readonly cafe: Bilingual;
  readonly area: AreaId;
  readonly category: CategoryId;
  /** Kuwaiti dinar, at most 3 decimals. */
  readonly priceKwd: number;
  readonly badge: BadgeId;
  readonly reason: Bilingual;
  readonly source: SourceId;
  /** ISO date (YYYY-MM-DD). Required: it drives freshness. */
  readonly dateVerified: string;
  readonly moods: readonly MoodId[];
  readonly layers: Layers;
  /** 1 to 10 for items shown in the weekly Top 10. */
  readonly topRank?: number;
}

export type Freshness = 'active' | 'needs_recheck';
export type PriceBand = 'low' | 'mid' | 'high';
