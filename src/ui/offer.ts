import type { MenuItem } from '../lib/types.ts';

import { CLIPS, clamp, clipFor, focusAt, lowData, sourceFor, type Clip } from './clips.ts';

export interface Offer {
  setItem(item: MenuItem): void;
  /** Pointer position over the stage, -1..1. */
  look(x: number, y: number): void;
  /** Cup leans a little toward the viewer (hover/focus). */
  lean(on: boolean): void;
  /** The hand brings the cup to the viewer; `done` fires when it has arrived. */
  offer(done: () => void): void;
  release(): void;
}

const mid = (w: readonly [number, number]): number => (w[0] + w[1]) / 2;

/**
 * Drives a real video of a barista's hand offering a cup, like a physical object:
 * the playhead is steered (forward at natural speed, back a little faster) between an
 * "idle" pose and a "close to you" pose, while the whole frame leans toward the viewer in 3D.
 */
export function createOffer(portal: HTMLElement, videos: Record<Clip['id'], HTMLVideoElement>, host: HTMLElement, plate: HTMLImageElement): Offer {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = lowData();
  let clip: Clip = CLIPS.hot;
  /** No footage for this drink: show the empty café counter, never a different cup. */
  let empty = false;
  let mode: 'idle' | 'lean' | 'offer' = 'idle';
  let t = mid(clip.idle);
  let dir = 1;
  let done: (() => void) | null = null;
  let arrived = false;
  let visible = true;
  let running = false;
  let last = 0;
  // smoothed 3D pose of the frame
  const pose = { rx: 0, ry: 0, tx: 0, ty: 0, s: 1, z: 0, ts: 1 };

  const loaded = new Set<Clip['id']>();
  const ensure = (id: Clip['id']): HTMLVideoElement => {
    const v = videos[id];
    if (!loaded.has(id)) {
      loaded.add(id);
      v.poster = `./media/poster-${id}.jpg`;
      if (!saveData) {
        const go = (): void => { v.src = sourceFor(id); v.load(); };
        if (document.readyState === 'complete') go();
        else window.addEventListener('load', go, { once: true });
      }
    }
    return v;
  };

  const show = (id: Clip['id'] | null): void => {
    for (const key of Object.keys(videos) as Clip['id'][]) videos[key].classList.toggle('is-on', key === id);
    if (id === null && !plate.src) plate.src = './media/cafe.jpg';
    plate.classList.toggle('is-on', id === null);
  };

  const seek = (): void => {
    const v = videos[clip.id];
    if (saveData || v.readyState < 2 || v.seeking) return;
    if (Math.abs(v.currentTime - t) > 0.012) v.currentTime = t;
  };

  const goal = (): readonly [number, number] => {
    if (mode === 'offer') return clip.peak;
    if (mode === 'lean') {
      const g = clip.idle[1] + (clip.peak[0] - clip.idle[1]) * 0.42;
      return [g, g + 0.2];
    }
    return clip.idle;
  };

  const applyPose = (dt: number): void => {
    const k = 1 - Math.exp(-dt * 7);
    pose.rx += (pose.tx - pose.rx) * k;
    pose.ry += (pose.ty - pose.ry) * k;
    const max = window.innerWidth < 900 ? 0.05 : 0.14;
    pose.ts = mode === 'offer' ? 1 + max : mode === 'lean' ? 1 + max * 0.3 : 1;
    pose.s += (pose.ts - pose.s) * (1 - Math.exp(-dt * 4));
    pose.z = (pose.s - 1) * 260;
    portal.style.setProperty('--rx', `${pose.rx.toFixed(2)}deg`);
    portal.style.setProperty('--ry', `${pose.ry.toFixed(2)}deg`);
    portal.style.setProperty('--s', pose.s.toFixed(4));
    portal.style.setProperty('--z', `${pose.z.toFixed(1)}px`);
    portal.style.setProperty('--depth', ((pose.s - 1) / max).toFixed(3));
  };

  const step = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const [a, b] = goal();
    if (t < a - 0.02) {
      t = Math.min(a, t + dt * 1.0); // natural speed forward: the real motion of the arm
    } else if (t > b + 0.02) {
      t = Math.max(b, t - dt * 1.7); // pull back a bit quicker
    } else {
      // hold with a slow breathing drift so it never freezes
      t += dir * dt * 0.3;
      if (t > b) { t = b; dir = -1; }
      if (t < a) { t = a; dir = 1; }
    }
    t = clamp(t, 0, 17);
    if (!empty) seek();
    if (mode === 'offer' && !arrived && t >= clip.peak[0] - 0.05) {
      arrived = true;
      const cb = done;
      done = null;
      window.setTimeout(() => cb?.(), 350);
    }
    portal.style.setProperty('--focus', focusAt(clip, t, portal.clientWidth / Math.max(1, portal.clientHeight)));
    applyPose(dt);
  };

  const loop = (now: number): void => {
    if (!running) return;
    step(now);
    requestAnimationFrame(loop);
  };
  const wake = (): void => {
    if (running || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(loop);
  };
  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) wake();
    else running = false;
  }).observe(host);
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else wake(); });

  const jump = (): void => {
    // reduced motion / data saver: no animation, just the still frames
    t = mode === 'offer' ? mid(clip.peak) : mid(clip.idle);
    pose.s = pose.ts = mode === 'offer' ? 1.06 : 1;
    applyPose(1);
    seek();
  };

  show(clip.id);
  ensure(clip.id);
  const start = (): void => (calm.matches ? jump() : wake());
  videos[clip.id].addEventListener('loadeddata', () => { seek(); start(); }, { once: true });
  start();

  return {
    setItem(item) {
      const next = clipFor(item);
      if (!next) {
        empty = true;
        show(null);
        return;
      }
      if (!empty && next.id === clip.id) return;
      empty = false;
      clip = next;
      t = mid(clip.idle);
      arrived = false;
      mode = 'idle';
      ensure(clip.id);
      show(clip.id);
      if (calm.matches) jump();
    },
    look(x, y) {
      pose.ty = x * 6;
      pose.tx = -y * 4;
      if (!running && !calm.matches) wake();
    },
    lean(on) {
      if (mode === 'offer') return;
      mode = on ? 'lean' : 'idle';
      if (calm.matches) jump();
      else wake();
    },
    offer(cb) {
      mode = 'offer';
      arrived = false;
      done = cb;
      if (calm.matches) {
        jump();
        arrived = true;
        done = null;
        cb();
        return;
      }
      wake();
    },
    release() {
      mode = 'idle';
      done = null;
      arrived = false;
      if (calm.matches) jump();
      else wake();
    },
  };
}
