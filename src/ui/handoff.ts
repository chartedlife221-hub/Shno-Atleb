import type { MenuItem } from '../lib/types.ts';
import { clamp, clipFor, HANDOFFS, handoffSource, handoffStart, lowData, type Handoff } from './clips.ts';

/**
 * Stage 3 of the order: a real hand holding the ordered drink comes out of the order card.
 *
 * The footage is one video with three stacked panes: the colour frame, an alpha matte of the hand
 * and cup (cut out with a segmentation model), and the background with the hand and cup removed.
 * The background is drawn *inside* the card (2D canvas, clipped by the card). The cut-out is drawn
 * by WebGL on a full-screen layer *above* the card, so it can grow past the card's edges with
 * extra perspective scale and a soft contact shadow, while the background stays behind.
 */
export interface HandoffPlayer {
  preload(item: MenuItem): void;
  /** True when this drink has matching footage. */
  has(item: MenuItem): boolean;
  /** True when this drink's footage is portrait (the card becomes tall). */
  tall(item: MenuItem): boolean;
  /** Starts stage 2 (window) and then stage 3 (hand-off) inside `card`. */
  play(item: MenuItem, card: HTMLElement, onStage: (stage: 2 | 3) => void, sourceTime?: number): void;
  stop(): void;
}

const VERT = `
attribute vec2 aPos;
uniform vec4 uRect;
varying vec2 vUv;
void main() {
  vUv = aPos;
  gl_Position = vec4(uRect.x + aPos.x * uRect.z, uRect.y + aPos.y * uRect.w, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uPaneH, uAlphaY, uMode, uOpacity, uBlur;
uniform vec4 uFeather;
float matte(vec2 uv) {
  uv = clamp(uv, vec2(0.002), vec2(0.998));
  return smoothstep(0.07, 0.93, texture2D(uTex, vec2(uv.x, uAlphaY + uv.y * uPaneH)).r);
}
void main() {
  vec2 uv = vUv;
  float edge = smoothstep(0.0, uFeather.x, uv.x) * smoothstep(0.0, uFeather.y, 1.0 - uv.x)
             * smoothstep(0.0, uFeather.z, uv.y) * smoothstep(0.0, uFeather.w, 1.0 - uv.y);
  if (uMode < 0.5) {
    vec3 c = texture2D(uTex, vec2(clamp(uv.x, 0.002, 0.998), clamp(uv.y, 0.002, 0.998) * uPaneH)).rgb;
    float a = matte(uv) * edge * uOpacity;
    gl_FragColor = vec4(c * a, a);
  } else {
    float a = 0.0;
    for (int i = -2; i <= 2; i++) {
      for (int j = -2; j <= 2; j++) a += matte(uv + vec2(float(i), float(j)) * uBlur);
    }
    a = a / 25.0 * edge * uOpacity;
    gl_FragColor = vec4(0.0, 0.0, 0.0, a);
  }
}`;

interface Rect { x: number; y: number; w: number; h: number }

const smooth = (x: number): number => x * x * (3 - 2 * x);

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type);
  if (!s) throw new Error('shader');
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
  return s;
}

function setupGl(canvas: HTMLCanvasElement): null | {
  gl: WebGLRenderingContext;
  u: (n: string) => WebGLUniformLocation | null;
  tex: WebGLTexture;
} {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
  if (!gl) return null;
  try {
    const p = gl.createProgram() as WebGLProgram;
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    gl.useProgram(p);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture() as WebGLTexture;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    return { gl, u: (n) => gl.getUniformLocation(p, n), tex };
  } catch {
    return null;
  }
}

export function createHandoff(els: {
  fg: HTMLCanvasElement;
  bg: HTMLCanvasElement;
  video: HTMLVideoElement;
  fgImg: HTMLImageElement;
  bgImg: HTMLImageElement;
  text: HTMLElement;
}): HandoffPlayer {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const small = window.matchMedia('(max-width: 700px)');
  const gl = lowData() ? null : setupGl(els.fg);
  const ctx = els.bg.getContext('2d');
  const still = (): boolean => calm.matches || !gl || !ctx || lowData();

  let clip: Handoff | null = null;
  let card: HTMLElement | null = null;
  let loadedId: string | null = null;
  let running = false;
  let stage: 0 | 2 | 3 = 0;
  let t = 0;
  let breath = 0;
  let t0 = 0;
  let stalledFor = 0;
  let lastT = -1;
  let fallen = false;
  let lastKey = '';
  let fade = 0;
  let last = 0;
  let timers: number[] = [];

  const load = (h: Handoff): void => {
    if (loadedId === h.id || still()) return; // still mode never downloads the video
    loadedId = h.id;
    els.video.src = handoffSource(h.id);
    els.video.load();
  };

  /** Where the full video frame sits inside the card (object-fit: cover that follows the cup). */
  const baseRect = (h: Handoff, c: DOMRect, p: number): Rect => {
    const s = Math.max(c.width / h.w, c.height / h.h);
    const w = h.w * s;
    const hh = h.h * s;
    const visible = Math.min(1, c.width / w);
    const cx = h.cupX[0] + (h.cupX[1] - h.cupX[0]) * p;
    const pos = visible >= 1 ? 0.5 : clamp((cx - visible / 2) / (1 - visible), 0, 1);
    const visY = Math.min(1, c.height / hh);
    const cy = h.cupY[0] + (h.cupY[1] - h.cupY[0]) * p;
    const posY = visY >= 1 ? 0.45 : clamp((cy - visY / 2) / (1 - visY), 0, 1);
    return { x: c.left + (c.width - w) * pos, y: c.top + (c.height - hh) * posY, w, h: hh };
  };

  /** On narrow (portrait) cards the cover crop makes the drink huge: present it a little smaller, bottom-aligned. */
  const subjectRect = (b: Rect, c: DOMRect): Rect => {
    const f = !small.matches ? 1 : clip && clip.h > clip.w ? 0.96 : 0.78;
    if (f === 1) return b;
    const w = b.w * f;
    const hh = b.h * f;
    const cx = b.x + b.w / 2;
    return { x: cx - w / 2, y: c.bottom - hh - (c.bottom - (b.y + b.h)) * f, w, h: hh };
  };

  /** The cut-out: grows from its anchor and drops toward the viewer as the hand comes forward. */
  const fgRect = (h: Handoff, b: Rect, p: number, clearOf: number): Rect => {
    const k = 1 + (h.h > h.w ? 0.1 : small.matches ? 0.12 : 0.18) * p;
    const ax = b.x + h.anchor[0] * b.w;
    const ay = b.y + h.anchor[1] * b.h;
    const r = { x: ax + (b.x - ax) * k, y: ay + (b.y - ay) * k, w: b.w * k, h: b.h * k };
    // keep the exact order readable: the drink comes forward *below* the order text, toward the viewer
    const subjectTop = r.y + r.h * (h.top[0] + (h.top[1] - h.top[0]) * p);
    if (subjectTop < clearOf) r.y += clearOf - subjectTop;
    return r;
  };

  const progress = (h: Handoff): number => smooth(clamp((t - t0) / Math.max(0.1, h.peak[0] - t0), 0, 1));

  const sizeCanvases = (c: DOMRect): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fw = Math.round(window.innerWidth * dpr);
    const fh = Math.round(window.innerHeight * dpr);
    if (els.fg.width !== fw || els.fg.height !== fh) { els.fg.width = fw; els.fg.height = fh; }
    const bw = Math.round(c.width * dpr);
    const bh = Math.round(c.height * dpr);
    if (els.bg.width !== bw || els.bg.height !== bh) { els.bg.width = bw; els.bg.height = bh; }
  };

  const drawBg = (h: Handoff, c: DOMRect, b: Rect): void => {
    if (!ctx || els.video.readyState < 2) return;
    const sx = els.bg.width / c.width;
    ctx.clearRect(0, 0, els.bg.width, els.bg.height);
    const tr = h.trim ?? 0;
    ctx.drawImage(els.video, tr, 2 * h.h + 2 * h.pad + tr, h.w - 2 * tr, h.h - 2 * tr, (b.x - c.left) * sx, (b.y - c.top) * sx, b.w * sx, b.h * sx);
  };

  const drawFg = (h: Handoff, r: Rect, p: number): void => {
    if (!gl) return;
    const g = gl.gl;
    g.viewport(0, 0, els.fg.width, els.fg.height);
    g.clearColor(0, 0, 0, 0);
    g.clear(g.COLOR_BUFFER_BIT);
    if (els.video.readyState < 2 || fade <= 0.001) return;
    g.bindTexture(g.TEXTURE_2D, gl.tex);
    g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, els.video);
    const total = 3 * h.h + 2 * h.pad;
    g.uniform1f(gl.u('uPaneH'), h.h / total);
    g.uniform1f(gl.u('uAlphaY'), (h.h + h.pad) / total);
    g.uniform4f(gl.u('uFeather'), h.feather[0], h.feather[1], h.feather[2], h.feather[3]);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const quad = (q: Rect): void => g.uniform4f(gl.u('uRect'), (q.x / vw) * 2 - 1, 1 - (q.y / vh) * 2, (q.w / vw) * 2, -(q.h / vh) * 2);
    // 1) soft contact shadow, a little lower and wider, darker as the drink comes closer
    g.uniform1f(gl.u('uMode'), 1);
    g.uniform1f(gl.u('uBlur'), 0.012 + 0.01 * p);
    g.uniform1f(gl.u('uOpacity'), fade * (0.1 + 0.18 * p));
    quad({ x: r.x - r.w * 0.01, y: r.y + r.h * (0.02 + 0.05 * p), w: r.w * 1.02, h: r.h });
    g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
    // 2) the hand and the drink
    g.uniform1f(gl.u('uMode'), 0);
    g.uniform1f(gl.u('uOpacity'), fade);
    quad(r);
    g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
  };

  const frame = (now: number): void => {
    if (!running || !clip || !card) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const h = clip;
    const v = els.video;
    if (stage >= 2) fade = Math.min(1, fade + dt / 0.8); // the hand appears with the window, where the hero left it
    if (stage === 3) {
      // the real movement of the arm plays at its natural speed, then the hand settles and holds the drink
      if (v.currentTime < h.peak[1] - 0.05 && !v.ended) {
        if (v.paused && v.readyState >= 2) v.play().catch(() => fallBack('play-rejected'));
        stalledFor = Math.abs(v.currentTime - lastT) < 0.001 ? stalledFor + dt : 0;
        if (stalledFor > 2.5) { fallBack('stalled'); return; } // stalled playback: finish with the still
      } else if (!v.paused) v.pause();
      lastT = v.currentTime;
      if (v.currentTime >= h.peak[0]) breath += dt;
    }
    t = v.currentTime;
    const c = card.getBoundingClientRect();
    // nothing moved: skip the redraw (keeps phones cool while the drink is held)
    const key = `${t.toFixed(3)}|${fade.toFixed(2)}|${c.left.toFixed(1)},${c.top.toFixed(1)},${c.width.toFixed(1)},${c.height.toFixed(1)}|${stage === 3 ? Math.round(breath * 20) : 0}`;
    if (key === lastKey) { requestAnimationFrame(frame); return; }
    lastKey = key;
    sizeCanvases(c);
    const p = progress(h);
    const b = baseRect(h, c, p);
    drawBg(h, c, b);
    const f = subjectRect(b, c);
    // once offered, the hand keeps "holding" it: a slow, small float so it never freezes
    const sway = Math.min(1, breath) * Math.sin(breath * 1.3) * 0.004;
    const tb = els.text.getBoundingClientRect();
    const r = fgRect(h, f, p, tb.bottom + 10);
    drawFg(h, { x: r.x - r.w * sway, y: r.y - r.h * sway * 1.5, w: r.w * (1 + 2 * sway), h: r.h * (1 + 2 * sway) }, p);
    card.style.setProperty('--depth', p.toFixed(3));
    // exposed for tests: where the cut-out reaches, compared with the card
    els.fg.dataset['bottom'] = fade > 0.5 ? String(Math.round(r.y + r.h)) : '';
    requestAnimationFrame(frame);
  };

  /** Reduced motion, data saver or no WebGL: still images in the final pose, same layout. */
  const placeStill = (): void => {
    if (!clip || !card) return;
    if (gl) { gl.gl.clearColor(0, 0, 0, 0); gl.gl.clear(gl.gl.COLOR_BUFFER_BIT); }
    const c = card.getBoundingClientRect();
    const b = baseRect(clip, c, 1);
    const r = fgRect(clip, subjectRect(b, c), 1, els.text.getBoundingClientRect().bottom + 10);
    els.bgImg.src = `./media/handoff-${clip.id}-bg.jpg`;
    els.fgImg.src = `./media/handoff-${clip.id}-fg.png`;
    for (const [img, rect, rel] of [[els.bgImg, b, true], [els.fgImg, r, false]] as const) {
      img.style.setProperty('left', `${rel ? rect.x - c.left : rect.x}px`);
      img.style.setProperty('top', `${rel ? rect.y - c.top : rect.y}px`);
      img.style.setProperty('width', `${rect.w}px`);
      img.style.setProperty('height', `${rect.h}px`);
    }
    els.bgImg.hidden = false;
    els.fgImg.hidden = false;
  };

  /** Video failed, stalled, never became ready, or WebGL was lost: show the same moment as still images. */
  let onFall: (() => void) | null = null;
  const fallBack = (why = 'error'): void => {
    if (fallen || !clip) return;
    els.fg.dataset['fallback'] = why;
    fallen = true;
    running = false;
    els.video.pause();
    onFall?.();
  };
  els.video.addEventListener('error', () => { if (running) fallBack('media-error'); });
  els.fg.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fallBack('context-lost'); });

  const clear = (): void => {
    for (const id of timers) window.clearTimeout(id);
    timers = [];
  };

  return {
    has: (item) => clipFor(item) !== null,
    tall: (item) => { const c = clipFor(item); return c !== null && HANDOFFS[c.id].h > HANDOFFS[c.id].w; },
    preload(item) {
      const c = clipFor(item);
      if (c) load(HANDOFFS[c.id]);
    },
    play(item, el, onStage, sourceTime) {
      clear();
      const c = clipFor(item);
      card = el;
      clip = c ? HANDOFFS[c.id] : null;
      stage = 0;
      breath = 0;
      lastKey = '';
      fade = 0;
      fallen = false;
      delete els.fg.dataset['fallback'];
      stalledFor = 0;
      lastT = -1;
      els.video.pause();
      els.bgImg.hidden = true;
      els.fgImg.hidden = true;
      const at = (ms: number, fn: () => void): void => { timers.push(window.setTimeout(fn, calm.matches ? Math.min(ms, 150) : ms)); };
      if (!clip) {
        // no footage of this exact drink: the window shows the empty café counter, never another cup
        els.bgImg.src = './media/cafe.jpg';
        for (const [k, v] of [['left', '0'], ['top', '0'], ['width', '100%'], ['height', '100%']] as const) els.bgImg.style.setProperty(k, v);
        els.bgImg.hidden = false;
        at(700, () => onStage(2));
        return;
      }
      const h = clip;
      t0 = handoffStart(h, sourceTime ?? h.offset);
      t = t0;
      const stillPath = (): void => {
        at(700, () => onStage(2));
        at(1400, () => { onStage(3); placeStill(); });
      };
      onFall = () => { if (stage < 3) { stage = 3; onStage(3); } placeStill(); };
      if (still()) { stillPath(); return; }
      load(h);
      const v = els.video;
      const seekTo = (): void => { if (Math.abs(v.currentTime - t0) > 0.03) v.currentTime = t0; };
      if (v.readyState >= 1) seekTo();
      else v.addEventListener('loadedmetadata', seekTo, { once: true });
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
      // Stage A (order) -> B (window, the hand where the hero left it) -> C (the hand comes forward)
      const ready = (): boolean => v.readyState >= 2 && !v.seeking && Math.abs(v.currentTime - t0) < 0.1;
      const started = performance.now();
      const waitB = (): void => {
        if (!running || fallen) return;
        if (ready()) {
          stage = 2;
          onStage(2);
          at(800, () => { if (!fallen) { stage = 3; onStage(3); } });
        } else if (performance.now() - started > 2600) fallBack('timeout'); // never wait forever for media
        else timers.push(window.setTimeout(waitB, 100));
      };
      at(650, waitB);
    },
    stop() {
      clear();
      running = false;
      els.video.pause();
      stage = 0;
      fade = 0;
      els.bgImg.hidden = true;
      els.fgImg.hidden = true;
      if (gl) {
        gl.gl.clearColor(0, 0, 0, 0);
        gl.gl.clear(gl.gl.COLOR_BUFFER_BIT);
      }
    },
  };
}
