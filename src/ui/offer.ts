import type { MenuItem } from '../lib/types.ts';
import { clamp, clipFor, focusAt, lowData, sourceFor, type Clip } from './clips.ts';

export interface Offer {
  setItem(item: MenuItem): void;
  /** Pointer position over the stage, -1..1. */
  look(x: number, y: number): void;
  /** Hover / touch-down: the frame leans in a little (no change to the footage). */
  lean(on: boolean): void;
  /**
   * Committed tap: the real footage plays forward (the barista's arm starts toward you) and `done` fires
   * with the current *source* time, so the order card can continue the same movement. Ignored while busy.
   */
  offer(done: (sourceTime: number) => void): boolean;
  /** Back to the resting pose (called after the order card closes). */
  release(): void;
  readonly busy: boolean;
}

const MAX_WAIT_MS = 1400;

/**
 * The hero: a real clip of a hand holding the drink. Poster first; the clip loads after the page.
 * Nothing seeks continuously: the rest pose is a still frame, and a committed tap plays the real movement.
 * Depth (tilt, lean, lift) is a light CSS transform on top of the footage.
 */
export function createOffer(portal: HTMLElement, videos: Record<Clip['id'], HTMLVideoElement>, host: HTMLElement, plate: HTMLImageElement): Offer {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = lowData();
  let clip: Clip | null = null; // set by setItem(): only the chosen drink's poster and clip are fetched
  let mode: 'rest' | 'lean' | 'offer' = 'rest';
  let busy = false;
  let lead = 0; // 0 at rest, 1 after the commit movement
  let running = false;
  let visible = true;
  let last = 0;
  const pose = { rx: 0, ry: 0, tx: 0, ty: 0, s: 1 };

  const loaded = new Set<Clip['id']>();
  const ensure = (c: Clip): void => {
    const v = videos[c.id];
    v.poster = `./media/poster-${c.id}.jpg`; // poster first: the drink is visible immediately
    if (loaded.has(c.id) || saveData) return;
    loaded.add(c.id);
    const go = (): void => {
      v.src = sourceFor(c.id);
      v.load();
      v.addEventListener('loadeddata', () => { if (clip?.id === c.id) rest(); }, { once: true });
    };
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
  };

  const show = (c: Clip | null): void => {
    for (const key of Object.keys(videos) as Clip['id'][]) videos[key].classList.toggle('is-on', key === c?.id);
    if (c === null && !plate.src) plate.src = './media/cafe.jpg';
    plate.classList.toggle('is-on', c === null);
    const tall = c !== null && c.h > c.w;
    portal.classList.toggle('is-tall', tall);
    const backdrop = portal.querySelector('.portal__backdrop');
    if (tall && c && backdrop instanceof HTMLImageElement) backdrop.src = `./media/poster-${c.id}.jpg`;
  };

  /** One seek to the resting frame (never during playback). */
  const rest = (): void => {
    if (!clip) return;
    const v = videos[clip.id];
    v.pause();
    lead = 0;
    if (v.readyState >= 1) {
      const target = clip.rest - clip.start;
      if (Math.abs(v.currentTime - target) > 0.02) v.currentTime = target;
    }
  };

  const applyPose = (dt: number): void => {
    const k = 1 - Math.exp(-dt * 7);
    pose.rx += (pose.tx - pose.rx) * k;
    pose.ry += (pose.ty - pose.ry) * k;
    const target = mode === 'offer' ? 1.035 : mode === 'lean' ? 1.015 : 1;
    pose.s += (target - pose.s) * (1 - Math.exp(-dt * 5));
    portal.style.setProperty('--rx', `${pose.rx.toFixed(2)}deg`);
    portal.style.setProperty('--ry', `${pose.ry.toFixed(2)}deg`);
    portal.style.setProperty('--s', pose.s.toFixed(4));
    portal.style.setProperty('--z', `${((pose.s - 1) * 300).toFixed(1)}px`);
    portal.style.setProperty('--depth', ((pose.s - 1) / 0.035).toFixed(3));
    if (clip && clip.h <= clip.w) portal.style.setProperty('--focus', focusAt(clip, lead, portal.clientWidth / Math.max(1, portal.clientHeight)));
  };

  const loop = (now: number): void => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (clip && mode === 'offer') lead = clamp((videos[clip.id].currentTime + clip.start - clip.rest) / clip.lead, 0, 1);
    applyPose(dt);
    const settled = Math.abs(pose.rx - pose.tx) < 0.01 && Math.abs(pose.ry - pose.ty) < 0.01 && mode === 'rest' && Math.abs(pose.s - 1) < 0.001;
    if (settled) { running = false; return; } // idle: no per-frame work at all
    requestAnimationFrame(loop);
  };
  const wake = (): void => {
    if (running || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(loop);
  };
  new IntersectionObserver((entries) => { visible = entries.some((e) => e.isIntersecting); if (visible) wake(); }).observe(host);


  return {
    get busy() { return busy; },
    setItem(item) {
      if (busy) return;
      const next = clipFor(item);
      portal.dataset['clip'] = next?.id ?? 'none';
      if (next !== null && next.id === clip?.id) return;
      clip = next;
      show(clip);
      if (clip) { ensure(clip); rest(); }
    },
    look(x, y) {
      if (calm.matches) return;
      pose.ty = x * 5;
      pose.tx = -y * 3;
      wake();
    },
    lean(on) {
      if (mode === 'offer') return;
      mode = on ? 'lean' : 'rest';
      if (!calm.matches) wake();
    },
    offer(done) {
      if (busy) return false;
      busy = true;
      const c = clip;
      if (!c) { done(0); return true; }
      const v = videos[c.id];
      mode = 'offer';
      const from = c.rest;
      if (calm.matches || saveData || v.readyState < 2) { done(from); return true; }
      wake();
      let finished = false;
      const finish = (): void => {
        if (finished) return;
        finished = true;
        v.pause();
        done(v.currentTime + c.start);
      };
      const end = c.rest - c.start + c.lead;
      const watch = (): void => {
        if (finished) return;
        if (v.currentTime >= end || v.ended) finish();
        else requestAnimationFrame(watch);
      };
      v.play().then(() => requestAnimationFrame(watch)).catch(finish);
      window.setTimeout(finish, MAX_WAIT_MS); // never wait on a stalled video
      return true;
    },
    release() {
      mode = 'rest';
      busy = false;
      portal.classList.add('is-returning');
      rest();
      window.setTimeout(() => portal.classList.remove('is-returning'), 450);
      wake();
    },
  };
}
