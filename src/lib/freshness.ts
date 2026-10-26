import type { Freshness, MenuItem } from './types.ts';

/** Items verified longer ago than this are flagged "needs recheck". */
export const STALE_DAYS = 60;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

/** Whole days between an ISO date and `now`, using UTC calendar days (timezone-stable). */
export function daysSince(iso: string, now: Date): number {
  if (!isIsoDate(iso)) return Number.POSITIVE_INFINITY;
  const then = Date.parse(`${iso}T00:00:00Z`);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((today - then) / 86_400_000);
}

export function freshnessOf(item: Pick<MenuItem, 'dateVerified'>, now: Date): Freshness {
  return daysSince(item.dateVerified, now) > STALE_DAYS ? 'needs_recheck' : 'active';
}
