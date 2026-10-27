import { h, icon } from '../lib/dom.ts';
import { freshnessOf } from '../lib/freshness.ts';
import { translate } from '../lib/i18n.ts';
import { formatDate, formatPrice, mapUrl } from '../lib/misc.ts';
import type { Key } from '../lib/dictionary.ts';
import type { Lang, MenuItem } from '../lib/types.ts';
import { DATA_IS_DEMO } from '../data/items.ts';
import { drinkArt } from './art.ts';

export interface CardActions {
  show(item: MenuItem): void;
  copy(item: MenuItem): void;
  correct(item: MenuItem): void;
}

/** A ticket-style card for one exact order. */
export function ticket(item: MenuItem, lang: Lang, actions: CardActions, now: Date, scope: string): HTMLLIElement {
  const t = (key: Key, vars?: Record<string, string | number>): string => translate(lang, key, vars);
  const stale = freshnessOf(item, now) === 'needs_recheck';
  const btn = (iconName: string, label: string, onClick: () => void, extra = ''): HTMLButtonElement =>
    h('button', { class: `tbtn ${extra}`.trim(), attrs: { type: 'button', 'aria-label': `${label}: ${item.name[lang]}`, title: label }, on: { click: onClick } }, icon(iconName), h('span', {}, label));

  const li = h(
    'li',
    { class: `ticket${stale ? ' ticket--stale' : ''}`, data: { id: item.id, reveal: '' } },
    h(
      'article',
      { class: 'ticket__in', attrs: { 'aria-labelledby': `n-${scope}-${item.id}` } },
      h('div', { class: 'ticket__art' }, drinkArt(item), h('span', { class: 'stamp', attrs: { dir: 'ltr' } }, formatPrice(item.priceKwd, lang))),
      h(
        'div',
        { class: 'ticket__body' },
        h('p', { class: 'tag' }, icon('star', 'icon icon--xs'), t(`badge_${item.badge}` as Key), DATA_IS_DEMO ? h('span', { class: 'tag__demo' }, t('demoTag')) : null),
        h('h3', { class: 'ticket__name', attrs: { id: `n-${scope}-${item.id}` } }, item.name[lang]),
        h('p', { class: 'ticket__cafe' }, `${item.cafe[lang]} · ${t(`area_${item.area}` as Key)}`),
        h('p', { class: 'ticket__reason' }, item.reason[lang]),
        h(
          'p',
          { class: 'ticket__meta' },
          h('span', { class: `dot ${DATA_IS_DEMO ? 'dot--demo' : stale ? 'dot--old' : 'dot--new'}`, attrs: { 'aria-hidden': 'true' } }),
          DATA_IS_DEMO
            ? t('demoMeta')
            : `${stale ? t('recheck') : t('fresh')} · ${t('verified')} ${formatDate(item.dateVerified, lang)} · ${t(`src_${item.source}` as Key)}`,
        ),
        h(
          'div',
          { class: 'ticket__actions' },
          btn('eye', t('showBarista'), () => actions.show(item), 'tbtn--main'),
          btn('copy', t('copyOrder'), () => actions.copy(item)),
          h('a', { class: 'tbtn', attrs: { href: mapUrl(item), target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${t('mapLink')}: ${item.cafe[lang]}` } }, icon('pin'), h('span', {}, t('mapLink'))),
          btn('plus', t('correctLink'), () => actions.correct(item)),
        ),
      ),
    ),
  );
  li.style.setProperty('--tone', item.layers[0]);
  li.style.setProperty('--tone-2', item.layers[1]);
  return li;
}
