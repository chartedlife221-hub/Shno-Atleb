import { describe, expect, it } from 'bun:test';
import { daysSince, freshnessOf, isIsoDate, STALE_DAYS } from '../../src/lib/freshness.ts';

const NOW = new Date('2026-10-26T12:00:00Z');

describe('freshness', () => {
  it('validates ISO dates strictly', () => {
    expect(isIsoDate('2026-10-26')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('26-10-2026')).toBe(false);
    expect(isIsoDate('')).toBe(false);
  });

  it('counts whole UTC days', () => {
    expect(daysSince('2026-10-26', NOW)).toBe(0);
    expect(daysSince('2026-10-25', NOW)).toBe(1);
    expect(daysSince('2026-08-27', NOW)).toBe(60);
  });

  it('flags items older than 60 days, and only those', () => {
    expect(STALE_DAYS).toBe(60);
    expect(freshnessOf({ dateVerified: '2026-08-27' }, NOW)).toBe('active');
    expect(freshnessOf({ dateVerified: '2026-08-26' }, NOW)).toBe('needs_recheck');
  });

  it('treats an invalid date as stale rather than fresh', () => {
    expect(freshnessOf({ dateVerified: 'nonsense' }, NOW)).toBe('needs_recheck');
  });
});
