import { must } from '../lib/dom.ts';
import { translate } from '../lib/i18n.ts';
import { formatPrice, mapUrl, orderText } from '../lib/misc.ts';
import type { Lang, MenuItem } from '../lib/types.ts';
import { CLIPS, clamp, clipFor, focusAt, lowData, progressAt, sourceFor, type Clip } from './clips.ts';

export interface OrderDialog {
  open(item: MenuItem, lang: Lang): void;
}

const APPROACH_RATE = 1.3;
const REVEAL_DELAY_MS = 700;

/**
 * The order card is a gateway: first it shows the exact order, then it opens onto a real scene
 * (video fades in with a focus pull) in which a hand brings the prepared drink toward you.
 */
export function setupDialog(copy: (text: string) => void): OrderDialog {
  const dlg = must('#barista', HTMLDialogElement);
  const card = must('.barista__card', HTMLElement, dlg);
  const nameEn = must('#dlg-name', HTMLElement);
  const nameAr = must('#dlg-name-ar', HTMLElement);
  const cafe = must('#dlg-cafe', HTMLElement);
  const price = must('#dlg-price', HTMLElement);
  const map = must('#dlg-map', HTMLAnchorElement);
  const shareBtn = must('#dlg-share', HTMLButtonElement);
  const videos: Record<Clip['id'], HTMLVideoElement> = { iced: must('#dv-iced', HTMLVideoElement), hot: must('#dv-hot', HTMLVideoElement) };
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = lowData();

  let current: { item: MenuItem; lang: Lang } | null = null;
  let clip: Clip = CLIPS.hot;
  let t = 0;
  let dir = 1;
  let running = false;
  let last = 0;
  let revealTimer = 0;
  const loaded = new Set<Clip['id']>();
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };

  shareBtn.hidden = typeof navigator.share !== 'function';
  must('#dlg-close', HTMLButtonElement).addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  must('#dlg-copy', HTMLButtonElement).addEventListener('click', () => { if (current) copy(orderText(current.item, current.lang)); });
  shareBtn.addEventListener('click', () => {
    if (!current) return;
    const { item, lang } = current;
    const text = translate(lang, 'shareText', { name: item.name[lang], cafe: item.cafe[lang], area: translate(lang, `area_${item.area}`) });
    navigator.share({ title: item.name[lang], text }).catch(() => undefined);
  });

  const prepare = (c: Clip): HTMLVideoElement => {
    const v = videos[c.id];
    if (!loaded.has(c.id)) {
      loaded.add(c.id);
      v.poster = `./media/poster-${c.id}.jpg`;
      if (!saveData) { v.src = sourceFor(c.id); v.load(); }
    }
    for (const key of Object.keys(videos) as Clip['id'][]) videos[key].classList.toggle('is-on', key === c.id);
    return v;
  };

  const seek = (): void => {
    const v = videos[clip.id];
    if (saveData || v.readyState < 2 || v.seeking) return;
    if (Math.abs(v.currentTime - t) > 0.012) v.currentTime = t;
  };

  const frame = (now: number): void => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (card.classList.contains('is-scene')) {
      const [a, b] = clip.peak;
      if (t < a) t = Math.min(a, t + dt * APPROACH_RATE);
      else { t += dir * dt * 0.3; if (t > b) { t = b; dir = -1; } if (t < a) { t = a; dir = 1; } }
      t = clamp(t, 0, 17);
      seek();
      const p = progressAt(clip, t);
      card.style.setProperty('--push', p.toFixed(3));
      videos[clip.id].style.setProperty('object-position', focusAt(clip, t, card.clientWidth / Math.max(1, card.clientHeight)));
    }
    const k = 1 - Math.exp(-dt * 7);
    tilt.x += (tilt.tx - tilt.x) * k;
    tilt.y += (tilt.ty - tilt.y) * k;
    card.style.setProperty('--tx', `${tilt.x.toFixed(2)}deg`);
    card.style.setProperty('--ty', `${tilt.y.toFixed(2)}deg`);
    requestAnimationFrame(frame);
  };
  const start = (): void => {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  };

  dlg.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    tilt.ty = (((e.clientX - r.left) / r.width) * 2 - 1) * 4;
    tilt.tx = -(((e.clientY - r.top) / r.height) * 2 - 1) * 3;
  });
  dlg.addEventListener('close', () => {
    window.clearTimeout(revealTimer);
    running = false;
    card.classList.remove('is-scene');
    for (const v of Object.values(videos)) v.pause();
    tilt.tx = tilt.ty = 0;
  });

  return {
    open(item, lang) {
      current = { item, lang };
      nameEn.textContent = item.name.en;
      nameAr.textContent = item.name.ar;
      cafe.textContent = `${item.cafe[lang]} · ${translate(lang, `area_${item.area}`)}`;
      price.textContent = formatPrice(item.priceKwd, lang);
      map.href = mapUrl(item);
      clip = clipFor(item);
      t = clip.idle[1] - 0.2;
      dir = 1;
      card.classList.remove('is-scene');
      card.style.setProperty('--push', '0');
      prepare(clip);
      if (!dlg.open) dlg.showModal();
      // 1) the card says the order; 2) it opens onto the scene
      const reveal = (): void => {
        card.classList.add('is-scene');
        if (calm.matches) {
          t = (clip.peak[0] + clip.peak[1]) / 2;
          card.style.setProperty('--push', '1');
          videos[clip.id].style.setProperty('object-position', focusAt(clip, t, card.clientWidth / Math.max(1, card.clientHeight)));
          seek();
          return;
        }
        start();
      };
      window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(reveal, calm.matches ? 150 : REVEAL_DELAY_MS);
      if (!calm.matches) start();
    },
  };
}
