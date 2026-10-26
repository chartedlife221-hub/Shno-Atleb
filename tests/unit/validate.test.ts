import { describe, expect, it } from 'bun:test';
import { cleanText, isBot, parseContact, parsePrice, validateSuggestion, validateWaitlist, westernDigits } from '../../src/lib/validate.ts';

const base = { cafe: 'Local Roaster A', order: 'Iced Spanish Latte', area: 'salmiya', price: '1.750', why: 'Smooth', website: '', elapsedMs: 5000 };

describe('text cleaning', () => {
  it('strips control and bidi-override characters and collapses whitespace', () => {
    expect(cleanText('  a\u0000b‮c \n\t d  ', 50)).toBe('a b c d');
  });
  it('caps the length and ignores non-strings', () => {
    expect(cleanText('x'.repeat(500), 10)).toHaveLength(10);
    expect(cleanText(42, 10)).toBe('');
  });
  it('keeps markup as plain text (it is escaped at render time, never parsed)', () => {
    expect(cleanText('<img src=x onerror=alert(1)>', 80)).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('price parsing', () => {
  it('accepts Latin and Arabic-Indic input', () => {
    expect(parsePrice('1.750')).toEqual({ ok: true, value: 1.75 });
    expect(parsePrice('١٫٧٥٠')).toEqual({ ok: true, value: 1.75 });
    expect(westernDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });
  it('treats empty as optional and rejects nonsense and out-of-range values', () => {
    expect(parsePrice('')).toEqual({ ok: true, value: null });
    for (const bad of ['abc', '-1', '0', '51', '1.2345', '1..2', '1e3']) expect(parsePrice(bad)).toEqual({ ok: false });
  });
});

describe('contact parsing', () => {
  it('accepts emails and Kuwaiti mobiles in common formats', () => {
    expect(parseContact('Name@Email.com')).toEqual({ kind: 'email', value: 'name@email.com' });
    expect(parseContact('55123456')).toEqual({ kind: 'phone', value: '+96555123456' });
    expect(parseContact('+965 6612 3456')).toEqual({ kind: 'phone', value: '+96566123456' });
    expect(parseContact('٩٩١٢٣٤٥٦')).toEqual({ kind: 'phone', value: '+96599123456' });
  });
  it('rejects invalid values', () => {
    for (const bad of ['', 'abc', 'a@b', '12345678', '4412345', '@x.com', 'a b@c.com']) expect(parseContact(bad)).toBeNull();
  });
});

describe('suggestion form', () => {
  it('accepts a valid submission and normalizes it', () => {
    const r = validateSuggestion(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ cafe: 'Local Roaster A', order: 'Iced Spanish Latte', area: 'salmiya', priceKwd: 1.75, why: 'Smooth' });
  });
  it('reports required, short, unknown-area and price errors per field', () => {
    const r = validateSuggestion({ ...base, cafe: '', order: 'a', area: 'mars', price: 'x' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual({ cafe: 'errRequired', order: 'errTooShort', area: 'errRequired', price: 'errPrice' });
  });
  it('rejects submissions that are filled in suspiciously fast', () => {
    const r = validateSuggestion({ ...base, elapsedMs: 200 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.form).toBe('errFast');
  });
});

describe('waitlist form + honeypot', () => {
  it('validates the contact', () => {
    expect(validateWaitlist({ contact: 'a@b.co', website: '', elapsedMs: 4000 }).ok).toBe(true);
    const bad = validateWaitlist({ contact: 'nope', website: '', elapsedMs: 4000 });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.contact).toBe('errContact');
    const empty = validateWaitlist({ contact: '  ', website: '', elapsedMs: 4000 });
    if (!empty.ok) expect(empty.errors.contact).toBe('errRequired');
  });
  it('detects a filled honeypot', () => {
    expect(isBot('')).toBe(false);
    expect(isBot('http://spam.example')).toBe(true);
  });
});
