import { must } from '../lib/dom.ts';
import { translate } from '../lib/i18n.ts';
import { safeGet, safeSet } from '../lib/misc.ts';
import { cleanText, isBot, validateSuggestion, validateWaitlist, type FieldErrors } from '../lib/validate.ts';
import type { Key } from '../lib/dictionary.ts';
import type { Lang } from '../lib/types.ts';

const MIN_GAP_MS = 20_000;
const TIMEOUT_MS = 8_000;
const RATE_KEY = 'sa.lastSend';

type Kind = 'suggestion' | 'waitlist';

/** Sends JSON to the configured endpoint. Empty endpoint = demo mode: nothing leaves the browser. */
async function send(kind: Kind, payload: Record<string, unknown>): Promise<'sent' | 'demo'> {
  if (__FORM_ENDPOINT__ === '') return 'demo';
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(__FORM_ENDPOINT__, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ kind, ...payload }),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      mode: 'cors',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return 'sent';
  } finally {
    window.clearTimeout(timer);
  }
}

function tooSoon(): boolean {
  const last = Number(safeGet(RATE_KEY) ?? '0');
  return Number.isFinite(last) && Date.now() - last < MIN_GAP_MS;
}

export interface Forms {
  /** Prefill the suggestion form to correct an existing item and move focus there. */
  correct(name: string): void;
  relabel(lang: Lang): void;
}

export function setupForms(getLang: () => Lang): Forms {
  const sForm = must('#suggest-form', HTMLFormElement);
  const wForm = must('#wait-form', HTMLFormElement);
  const sResult = must('#suggest-result', HTMLElement);
  const wResult = must('#wait-result', HTMLElement);
  const sErrors = must('#suggest-errors', HTMLElement);
  const correcting = must('#correcting', HTMLElement);
  const t = (key: Key, vars?: Record<string, string | number>): string => translate(getLang(), key, vars);
  const openedAt = { s: performance.now(), w: performance.now() };
  let correctingName = '';

  const value = (form: HTMLFormElement, name: string): string => {
    const el = form.elements.namedItem(name);
    return el instanceof HTMLInputElement || el instanceof HTMLSelectElement ? el.value : '';
  };

  const showErrors = (form: HTMLFormElement, prefix: string, errors: FieldErrors<string>, summary?: HTMLElement): void => {
    for (const el of form.querySelectorAll<HTMLElement>('.field__err')) el.textContent = '';
    for (const el of form.querySelectorAll<HTMLElement>('[aria-invalid]')) el.removeAttribute('aria-invalid');
    const lines: string[] = [];
    let first: HTMLElement | null = null;
    for (const [field, key] of Object.entries(errors)) {
      if (!key) continue;
      const msg = t(key);
      lines.push(msg);
      const err = form.querySelector<HTMLElement>(`#${prefix}-${field}-err`);
      const input = form.elements.namedItem(field);
      if (err) err.textContent = msg;
      if (input instanceof HTMLElement) {
        input.setAttribute('aria-invalid', 'true');
        first ??= input;
      }
    }
    if (summary) {
      summary.hidden = lines.length === 0;
      summary.textContent = lines.length ? `${t('errSummary')} ${lines.join(' · ')}` : '';
    }
    first?.focus();
  };

  const submit = async (kind: Kind, payload: Record<string, unknown>, result: HTMLElement, okKey: Key, form: HTMLFormElement): Promise<void> => {
    if (tooSoon()) {
      result.textContent = t('errRate');
      return;
    }
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (button) button.disabled = true;
    result.textContent = t('sending');
    try {
      const outcome = await send(kind, payload);
      safeSet(RATE_KEY, String(Date.now()));
      result.textContent = outcome === 'demo' ? `${t(okKey)} ${t('demoNote')}` : t(okKey);
      form.reset();
      correctingName = '';
      correcting.hidden = true;
    } catch {
      result.textContent = t('errNetwork');
    } finally {
      if (button) button.disabled = false;
    }
  };

  sForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sResult.textContent = '';
    const elapsedMs = performance.now() - openedAt.s;
    const res = validateSuggestion({
      cafe: value(sForm, 'cafe'), order: value(sForm, 'order'), area: value(sForm, 'area'),
      price: value(sForm, 'price'), why: value(sForm, 'why'), website: value(sForm, 'website'), elapsedMs,
    });
    if (isBot(value(sForm, 'website'))) {
      sResult.textContent = t('submitOk'); // pretend success, send nothing
      return;
    }
    if (!res.ok) {
      showErrors(sForm, 'suggest', res.errors, sErrors);
      return;
    }
    showErrors(sForm, 'suggest', {}, sErrors);
    void submit('suggestion', { ...res.value, correctionFor: cleanText(correctingName, 80) || null }, sResult, 'submitOk', sForm);
  });

  wForm.addEventListener('submit', (e) => {
    e.preventDefault();
    wResult.textContent = '';
    const res = validateWaitlist({ contact: value(wForm, 'contact'), website: value(wForm, 'website'), elapsedMs: performance.now() - openedAt.w });
    if (isBot(value(wForm, 'website'))) {
      wResult.textContent = t('waitOk');
      return;
    }
    if (!res.ok) {
      showErrors(wForm, 'wait', res.errors);
      return;
    }
    showErrors(wForm, 'wait', {});
    void submit('waitlist', { ...res.value }, wResult, 'waitOk', wForm);
  });

  return {
    correct(name) {
      correctingName = name;
      correcting.hidden = false;
      correcting.textContent = t('correctingFor', { name });
      openedAt.s = performance.now() - 2000;
      const order = sForm.elements.namedItem('order');
      document.getElementById('share')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (order instanceof HTMLInputElement) window.setTimeout(() => order.focus({ preventScroll: true }), 350);
    },
    relabel() {
      if (correctingName) correcting.textContent = t('correctingFor', { name: correctingName });
    },
  };
}
