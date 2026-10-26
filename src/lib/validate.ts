import type { AreaId } from './types.ts';
import { AREAS } from './types.ts';
import type { Key } from './dictionary.ts';

export type FieldErrors<F extends string> = Partial<Record<F, Key>>;
export type Result<T, F extends string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: FieldErrors<F> };

/** Removes control characters, normalizes Unicode, collapses whitespace and caps the length. */
export function cleanText(input: unknown, max: number): string {
  if (typeof input !== 'string') return '';
  return input
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F‎‏‪-‮⁦-⁩]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Accepts Arabic-Indic digits and the Arabic decimal separator, returns a normalized string. */
export function westernDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٫,]/g, '.');
}

/** Parses an optional KWD price with up to 3 decimals, 0 < price <= 50. */
export function parsePrice(input: string): { ok: true; value: number | null } | { ok: false } {
  const text = westernDigits(cleanText(input, 12));
  if (text === '') return { ok: true, value: null };
  if (!/^\d{1,2}(\.\d{1,3})?$/.test(text)) return { ok: false };
  const value = Number(text);
  return value > 0 && value <= 50 ? { ok: true, value } : { ok: false };
}

const EMAIL = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;

/** Returns a canonical contact: lowercase email, or a Kuwaiti mobile as +965XXXXXXXX. */
export function parseContact(input: string): { kind: 'email' | 'phone'; value: string } | null {
  const text = cleanText(input, 120);
  if (text.length <= 254 && EMAIL.test(text)) return { kind: 'email', value: text.toLowerCase() };
  const digits = westernDigits(text).replace(/[\s\-().]/g, '').replace(/^(\+|00)?965/, '');
  if (/^[569]\d{7}$/.test(digits)) return { kind: 'phone', value: `+965${digits}` };
  return null;
}

export interface SuggestionInput {
  readonly cafe: string;
  readonly order: string;
  readonly area: string;
  readonly price: string;
  readonly why: string;
  /** Honeypot: real people leave it empty. */
  readonly website: string;
  readonly elapsedMs: number;
}
export interface Suggestion {
  readonly cafe: string;
  readonly order: string;
  readonly area: AreaId;
  readonly priceKwd: number | null;
  readonly why: string;
}
type SuggestionField = 'cafe' | 'order' | 'area' | 'price' | 'form';

export const MIN_FILL_MS = 1500;

export function validateSuggestion(raw: SuggestionInput): Result<Suggestion, SuggestionField> {
  const errors: FieldErrors<SuggestionField> = {};
  const cafe = cleanText(raw.cafe, 60);
  const order = cleanText(raw.order, 80);
  const why = cleanText(raw.why, 200);
  const area = AREAS.find((a) => a === raw.area);
  const price = parsePrice(raw.price);

  if (cafe === '') errors.cafe = 'errRequired';
  else if (cafe.length < 2) errors.cafe = 'errTooShort';
  if (order === '') errors.order = 'errRequired';
  else if (order.length < 2) errors.order = 'errTooShort';
  if (!area) errors.area = 'errRequired';
  if (!price.ok) errors.price = 'errPrice';
  if (raw.elapsedMs < MIN_FILL_MS) errors.form = 'errFast';

  if (Object.keys(errors).length > 0 || !area || !price.ok) return { ok: false, errors };
  return { ok: true, value: { cafe, order, area, priceKwd: price.value, why } };
}

export interface WaitlistInput {
  readonly contact: string;
  readonly website: string;
  readonly elapsedMs: number;
}
type WaitlistField = 'contact' | 'form';

export function validateWaitlist(raw: WaitlistInput): Result<{ kind: 'email' | 'phone'; value: string }, WaitlistField> {
  const errors: FieldErrors<WaitlistField> = {};
  const contact = cleanText(raw.contact, 120) === '' ? null : parseContact(raw.contact);
  if (cleanText(raw.contact, 120) === '') errors.contact = 'errRequired';
  else if (!contact) errors.contact = 'errContact';
  if (raw.elapsedMs < MIN_FILL_MS) errors.form = 'errFast';
  if (Object.keys(errors).length > 0 || !contact) return { ok: false, errors };
  return { ok: true, value: contact };
}

/** True when the honeypot is filled: the caller should pretend success and send nothing. */
export function isBot(honeypot: string): boolean {
  return cleanText(honeypot, 50) !== '';
}
