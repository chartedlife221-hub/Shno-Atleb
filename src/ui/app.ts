import { ITEMS } from '../data/items.ts';
import { h, icon, must } from '../lib/dom.ts';
import { applyFilters, NO_FILTERS, uniqueCafes, type Filters } from '../lib/filters.ts';
import { directionOf, initialLang, translate } from '../lib/i18n.ts';
import { copyText, formatPrice, orderText, safeGet, safeSet } from '../lib/misc.ts';
import { greetingForHour, moodForHour, pickNext, poolFor } from '../lib/pick.ts';
import { AREAS, CATEGORIES, MOODS, type AreaId, type Lang, type MenuItem, type MoodChoice, type PriceBand } from '../lib/types.ts';
import type { Key } from '../lib/dictionary.ts';
import { createScene, type Scene } from '../gfx/scene.ts';
import { ticket, type CardActions } from './card.ts';
import { createCup } from './cup.ts';
import { setupDialog } from './dialog.ts';
import { setupForms } from './forms.ts';
import { applyI18n } from './i18n-dom.ts';
import { renderMap } from './map.ts';
import { observeReveal, scrollSpy } from './reveal.ts';

interface State {
  lang: Lang;
  mood: MoodChoice;
  current: MenuItem | null;
  filters: Filters;
}

export function startApp(): void {
  const now = new Date();
  const root = document.documentElement;
  const state: State = {
    lang: initialLang(safeGet('sa.lang')),
    mood: moodForHour(now.getHours()),
    current: null,
    filters: NO_FILTERS,
  };
  const t = (key: Key, vars?: Record<string, string | number>): string => translate(state.lang, key, vars);

  const status = must('#status', HTMLElement);
  const stage = must('#stage', HTMLElement);
  const cup = createCup();
  const glWrap = must('#gl-wrap', HTMLElement);
  const scene: Scene | null = createScene(must('#gl', HTMLCanvasElement), glWrap);
  const order = must('#order', HTMLElement);
  if (scene) {
    must('#cup-fallback', HTMLElement).hidden = true;
    order.hidden = false;
  } else {
    glWrap.hidden = true;
    must('#cup-fallback', HTMLElement).appendChild(cup.el);
  }
  const paintOrder = (item: MenuItem): void => {
    must('#o-name', HTMLElement).textContent = item.name[state.lang];
    must('#o-cafe', HTMLElement).textContent = `${item.cafe[state.lang]} · ${t(`area_${item.area}` as Key)}`;
    must('#o-price', HTMLElement).textContent = formatPrice(item.priceKwd, state.lang);
    order.classList.remove('is-new');
    void order.offsetWidth;
    order.classList.add('is-new');
  };

  const say = (message: string): void => {
    status.textContent = '';
    window.setTimeout(() => (status.textContent = message), 30); // re-announce identical text
  };
  const copy = (text: string): void => {
    void copyText(text).then((ok) => say(ok ? t('copied') : t('copyFail')));
  };
  const dialog = setupDialog(copy);
  const forms = setupForms(() => state.lang);

  const actions: CardActions = {
    show: (item) => dialog.open(item, state.lang),
    copy: (item) => copy(orderText(item, state.lang)),
    correct: (item) => forms.correct(item.name[state.lang]),
  };

  // ----- theme -----
  const themeBtn = must('#theme-btn', HTMLButtonElement);
  const setTheme = (theme: 'light' | 'dark' | null): void => {
    if (theme) root.dataset['theme'] = theme;
    else delete root.dataset['theme'];
    const dark = theme === 'dark' || (theme === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
    themeBtn.setAttribute('aria-pressed', String(dark));
    themeBtn.replaceChildren(icon(dark ? 'sun' : 'moon'));
  };
  const storedTheme = safeGet('sa.theme');
  setTheme(storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : null);
  themeBtn.addEventListener('click', () => {
    const next = themeBtn.getAttribute('aria-pressed') === 'true' ? 'light' : 'dark';
    safeSet('sa.theme', next);
    setTheme(next);
  });

  // ----- hero -----
  const moodsHost = must('#moods', HTMLElement);
  const choose = (mood: MoodChoice): void => {
    state.mood = mood;
    renderMoods();
    shuffle();
  };
  function renderMoods(): void {
    moodsHost.replaceChildren(
      ...(['any', ...MOODS] as const).map((m) =>
        h('button', { class: 'chip', attrs: { type: 'button', 'aria-pressed': String(state.mood === m) }, on: { click: () => choose(m) } }, t(`mood_${m}` as Key)),
      ),
    );
  }
  function show(item: MenuItem | null, announce: boolean): void {
    state.current = item;
    if (!item) return;
    if (scene) {
      scene.setDrink(item.layers);
      scene.ripple(0.7);
      paintOrder(item);
    } else cup.write(item, state.lang);
    if (announce) say(t('pickAnnounce', { name: item.name[state.lang], cafe: item.cafe[state.lang], price: formatPrice(item.priceKwd, state.lang) }));
  }
  function shuffle(): void {
    show(pickNext(poolFor(ITEMS, state.mood), state.current?.id ?? null), true);
  }
  must('#shuffle-btn', HTMLButtonElement).addEventListener('click', shuffle);
  const takeIt = (): void => {
    const item = state.current;
    if (!item) return;
    if (!scene) return dialog.open(item, state.lang);
    scene.offer(() => dialog.open(item, state.lang));
  };
  must('#show-btn', HTMLButtonElement).addEventListener('click', takeIt);
  must('#cup-btn', HTMLButtonElement).addEventListener('click', takeIt);
  must('#cup-btn', HTMLButtonElement).addEventListener('pointerdown', () => scene?.ripple(0.8));
  must('#barista', HTMLDialogElement).addEventListener('close', () => scene?.release());
  stage.addEventListener('pointermove', (e) => {
    const r = glWrap.getBoundingClientRect();
    scene?.look(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  });
  stage.addEventListener('pointerleave', () => scene?.look(0, 0));
  must('#copy-btn', HTMLButtonElement).addEventListener('click', () => state.current && actions.copy(state.current));

  // ----- browse -----
  const grid = must('#grid', HTMLElement);
  const count = must('#count', HTMLElement);
  const empty = must('#empty', HTMLElement);
  const cats = must('#cats', HTMLElement);
  const fQuery = must('#f-query', HTMLInputElement);
  const fArea = must('#f-area', HTMLSelectElement);
  const fCafe = must('#f-cafe', HTMLSelectElement);
  const fPrice = must('#f-price', HTMLSelectElement);
  const sArea = must('#s-area', HTMLSelectElement);

  const fill = (select: HTMLSelectElement, options: readonly (readonly [string, string])[], selected: string): void => {
    select.replaceChildren(...options.map(([value, label]) => h('option', { attrs: { value } }, label)));
    select.value = selected;
  };
  const renderControls = (): void => {
    const f = state.filters;
    fill(fArea, [['all', t('all')], ...AREAS.map((a) => [a, t(`area_${a}` as Key)] as const)], f.area);
    fill(fCafe, [['all', t('all')], ...uniqueCafes(ITEMS).map((c) => [c.en, c[state.lang]] as const)], f.cafe);
    fill(fPrice, [['all', t('all')], ['low', t('price_low')], ['mid', t('price_mid')], ['high', t('price_high')]], f.price);
    fill(sArea, [['', '—'], ...AREAS.map((a) => [a, t(`area_${a}` as Key)] as const)], sArea.value);
    fQuery.value = f.query;
    cats.replaceChildren(
      ...(['all', ...CATEGORIES] as const).map((c) =>
        h('button', { class: 'chip chip--cat', attrs: { type: 'button', 'aria-pressed': String(f.category === c) }, on: { click: () => setFilters({ category: c }) } }, t(`cat_${c}` as Key)),
      ),
    );
  };
  const renderGrid = (): void => {
    const list = applyFilters(ITEMS, state.filters);
    grid.replaceChildren(...list.map((it) => ticket(it, state.lang, actions, now, 'g')));
    count.textContent = list.length === 1 ? t('countOne') : t('countMany', { n: list.length });
    empty.hidden = list.length > 0;
    observeReveal(grid);
  };
  function setFilters(patch: Partial<Filters>): void {
    state.filters = { ...state.filters, ...patch };
    renderControls();
    renderGrid();
  }
  let typing = 0;
  fQuery.addEventListener('input', () => {
    window.clearTimeout(typing);
    typing = window.setTimeout(() => {
      state.filters = { ...state.filters, query: fQuery.value };
      renderGrid();
    }, 120);
  });
  fArea.addEventListener('change', () => setFilters({ area: fArea.value === 'all' ? 'all' : (AREAS.find((a) => a === fArea.value) ?? 'all') }));
  fCafe.addEventListener('change', () => setFilters({ cafe: fCafe.value }));
  fPrice.addEventListener('change', () => {
    const v = fPrice.value;
    setFilters({ price: v === 'low' || v === 'mid' || v === 'high' ? (v as PriceBand) : 'all' });
  });
  must('#f-clear', HTMLButtonElement).addEventListener('click', () => setFilters({ ...NO_FILTERS }));
  must('#filters', HTMLFormElement).addEventListener('submit', (e) => e.preventDefault());

  // ----- ticker, top 10, map -----
  const renderTicker = (): void => {
    const strip = (hidden: boolean): HTMLElement =>
      h('div', { class: 'ticker__strip', attrs: hidden ? { 'aria-hidden': 'true' } : {} },
        ...ITEMS.flatMap((it) => [h('span', { class: 'ticker__item' }, icon('bean', 'icon icon--xs'), `${it.name[state.lang]} · ${it.cafe[state.lang]}`)]));
    must('#ticker', HTMLElement).replaceChildren(strip(false), strip(true));
  };
  const renderTop = (): void => {
    const top = ITEMS.filter((i) => i.topRank !== undefined).sort((a, b) => (a.topRank ?? 99) - (b.topRank ?? 99));
    const host = must('#top-list', HTMLElement);
    host.replaceChildren(
      ...top.map((it) => {
        const li = ticket(it, state.lang, actions, now, 't');
        li.prepend(h('span', { class: 'rank', attrs: { 'aria-label': t('rankLabel', { n: it.topRank ?? 0 }) } }, String(it.topRank ?? '')));
        return li;
      }),
    );
    observeReveal(host);
  };
  const renderMapNow = (): void =>
    renderMap(must('#map', HTMLElement), ITEMS, state.lang, (area: AreaId) => {
      setFilters({ area });
      document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

  // ----- language -----
  const renderAll = (): void => {
    root.lang = state.lang;
    root.dir = directionOf(state.lang);
    applyI18n(document, state.lang);
    must('#greeting', HTMLElement).textContent = t(greetingForHour(now.getHours()));
    renderMoods();
    renderControls();
    renderGrid();
    renderTicker();
    renderTop();
    renderMapNow();
    forms.relabel(state.lang);
    if (state.current) {
      if (scene) paintOrder(state.current);
      else cup.write(state.current, state.lang);
    }
  };
  must('#lang-btn', HTMLButtonElement).addEventListener('click', () => {
    state.lang = state.lang === 'ar' ? 'en' : 'ar';
    safeSet('sa.lang', state.lang);
    renderAll();
  });

  renderAll();
  show(pickNext(poolFor(ITEMS, state.mood), null), false);
  observeReveal(document);
  scrollSpy();
  document.body.classList.add('is-ready');
}
