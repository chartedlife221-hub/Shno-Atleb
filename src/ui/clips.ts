import type { MenuItem } from '../lib/types.ts';

/**
 * The two real clips of a hand offering a cup. Times are seconds into each clip.
 * idle = cup far away, barely moving; peak = the hand has brought the cup right up to the screen.
 */
export interface Clip {
  readonly id: 'iced' | 'hot';
  readonly idle: readonly [number, number];
  readonly peak: readonly [number, number];
  /** Where the cup is horizontally (0..1 of the frame) at idle and at peak, to keep it in view when cropped. */
  readonly cupX: readonly [number, number];
}

export const CLIPS: Record<Clip['id'], Clip> = {
  iced: { id: 'iced', idle: [0.1, 3.2], peak: [7.4, 10.2], cupX: [0.5, 0.48] },
  hot: { id: 'hot', idle: [7.65, 8.05], peak: [11.2, 12.4], cupX: [0.84, 0.41] },
};

/** The iced clip has "Ice Vanilla Americano" printed on its cup, so only that order may use it. */
export function clipFor(item: MenuItem): Clip {
  return item.id === 'iced-vanilla-americano' ? CLIPS.iced : CLIPS.hot;
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

const VIDEO_ASPECT = 678 / 360;

/** object-position that keeps the moving cup centred when the frame is cropped to `aspect` (width / height). */
export function focusAt(clip: Clip, t: number, aspect: number): string {
  const p = progressAt(clip, t);
  const cx = clip.cupX[0] + (clip.cupX[1] - clip.cupX[0]) * p;
  const visible = Math.min(1, aspect / VIDEO_ASPECT);
  const pos = visible >= 1 ? 0.5 : clamp((cx - visible / 2) / (1 - visible), 0, 1);
  return `${(pos * 100).toFixed(1)}% 45%`;
}

/** True when the visitor asked to save data or is on a very slow connection: show still frames, skip the videos. */
export function lowData(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return c?.saveData === true || c?.effectiveType === 'slow-2g' || c?.effectiveType === '2g';
}
