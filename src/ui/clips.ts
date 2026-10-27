import type { MenuItem } from '../lib/types.ts';

/**
 * The two real clips of a hand offering a cup. Times are seconds into each clip.
 * idle = cup far away, barely moving; peak = the hand has brought the cup right up to the screen.
 */
export interface Clip {
  readonly id: 'iced' | 'hot' | 'spanish' | 'frappe';
  /** Native size of the clip; portrait clips are shown whole (contained) in landscape frames. */
  readonly w: number;
  readonly h: number;
  readonly idle: readonly [number, number];
  readonly peak: readonly [number, number];
  /** Where the cup is horizontally (0..1 of the frame) at idle and at peak, to keep it in view when cropped. */
  readonly cupX: readonly [number, number];
}

export const CLIPS: Record<Clip['id'], Clip> = {
  iced: { id: 'iced', w: 678, h: 360, idle: [0.1, 3.2], peak: [7.4, 10.2], cupX: [0.5, 0.48] },
  hot: { id: 'hot', w: 638, h: 342, idle: [7.65, 8.05], peak: [11.2, 12.4], cupX: [0.84, 0.41] },
  frappe: { id: 'frappe', w: 540, h: 960, idle: [0.2, 1.2], peak: [4.6, 7.9], cupX: [0.45, 0.5] },
  spanish: { id: 'spanish', w: 562, h: 1010, idle: [0.3, 2.2], peak: [5.0, 5.5], cupX: [0.45, 0.5] },
};

/**
 * We never show a different drink as the order:
 * - the iced clip has "Ice Vanilla Americano" printed on its clear cup, so only that order uses it;
 * - the layered iced Spanish latte glass is only that order;
 * - the whipped-cream caramel glass is only the Caramel Frappuccino;
 * - the white lidded takeaway cup is how every hot drink is served, so hot drinks use it.
 * Other iced drinks, frappés, matcha and desserts have no footage yet and return null.
 */
export function clipFor(item: MenuItem): Clip | null {
  if (item.id === 'iced-vanilla-americano') return CLIPS.iced;
  if (item.id === 'iced-spanish-latte') return CLIPS.spanish;
  if (item.id === 'caramel-frappuccino') return CLIPS.frappe;
  const hot = item.category !== 'cake_dessert' && item.moods.includes('warm') && !/iced|frapp/i.test(item.name.en);
  return hot ? CLIPS.hot : null;
}

/**
 * Cut-out hand-off clips: one video holding three stacked panes (colour, alpha matte, background with
 * the hand and cup removed), all at the clip's native size. Times are seconds into these clips.
 */
export interface Handoff {
  readonly id: Clip['id'];
  readonly w: number;
  readonly h: number;
  readonly pad: number;
  /** When the hand has brought the cup right up to the screen, and the window it then breathes in. */
  readonly peak: readonly [number, number];
  /** Where the cup is horizontally (0..1) at the start and at the peak. */
  readonly cupX: readonly [number, number];
  /** The point the cut-out grows from as it comes toward the viewer (0..1 of the frame). */
  readonly anchor: readonly [number, number];
  /** Top of the hand-and-cup at the start and at the peak (0..1 of the frame), to keep the order text clear. */
  readonly top: readonly [number, number];
  /** Vertical centre of the drink (0..1), used to frame portrait clips. */
  readonly cupY: readonly [number, number];
  /** Pixels to trim from each edge of the background (some source clips have a thin black border). */
  readonly trim?: number;
  /** Soft edges where the arm leaves the frame: left, right, top, bottom (0..1 of the frame). */
  readonly feather: readonly [number, number, number, number];
}

export const HANDOFFS: Record<Clip['id'], Handoff> = {
  hot: { id: 'hot', w: 638, h: 342, pad: 8, peak: [4.3, 5.75], cupX: [0.84, 0.41], anchor: [0.62, 0.18], top: [0.3, 0.12], cupY: [0.45, 0.45], feather: [0.03, 0.1, 0.1, 0.05] },
  iced: { id: 'iced', w: 678, h: 360, pad: 8, peak: [4.45, 7.2], cupX: [0.5, 0.48], anchor: [0.5, 0.2], top: [0.22, 0.02], cupY: [0.45, 0.45], feather: [0.04, 0.04, 0.05, 0.1] },
  frappe: { id: 'frappe', w: 540, h: 960, pad: 8, peak: [4.6, 7.9], cupX: [0.45, 0.55], anchor: [0.5, 0.35], top: [0.24, 0.2], cupY: [0.55, 0.55], feather: [0.2, 0.03, 0.05, 0.03] },
  spanish: { id: 'spanish', w: 610, h: 1058, pad: 8, trim: 24, peak: [2.95, 7.5], cupX: [0.45, 0.5], anchor: [0.5, 0.3], top: [0.32, 0.1], cupY: [0.6, 0.55], feather: [0.08, 0.03, 0.05, 0.04] },
};

export function handoffSource(id: Clip['id']): string {
  const probe = document.createElement('video');
  const mp4 = probe.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '';
  return `./media/handoff-${id}.${mp4 ? 'mp4' : 'webm'}`;
}

export function sourceFor(id: Clip['id']): string {
  const probe = document.createElement('video');
  const mp4 = probe.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '';
  return `./media/offer-${id}.${mp4 ? 'mp4' : 'webm'}`;
}

export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

/** 0 at the idle pose, 1 once the cup has arrived. */
export function progressAt(clip: Clip, t: number): number {
  return clamp((t - clip.idle[1]) / (clip.peak[0] - clip.idle[1]), 0, 1);
}

/** object-position that keeps the moving cup centred when the frame is cropped to `aspect` (width / height). */
export function focusAt(clip: Clip, t: number, aspect: number): string {
  const p = progressAt(clip, t);
  const cx = clip.cupX[0] + (clip.cupX[1] - clip.cupX[0]) * p;
  const visible = Math.min(1, aspect / (clip.w / clip.h));
  const pos = visible >= 1 ? 0.5 : clamp((cx - visible / 2) / (1 - visible), 0, 1);
  return `${(pos * 100).toFixed(1)}% 45%`;
}

/** True when the visitor asked to save data or is on a very slow connection: show still frames, skip the videos. */
export function lowData(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return c?.saveData === true || c?.effectiveType === 'slow-2g' || c?.effectiveType === '2g';
}
