import { FRAG, VERT } from './shader.ts';

export interface Scene {
  setDrink(layers: readonly string[]): void;
  /** Normalised pointer position, -1..1 on both axes (0,0 = centre). */
  look(x: number, y: number): void;
  /** Makes the liquid slosh. */
  ripple(amount: number): void;
  /** The barista's hand brings the glass toward the viewer; `done` fires when it arrives. */
  offer(done: () => void): void;
  release(): void;
  dispose(): void;
}

const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

function hexToLinear(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = (v: number): number => (v / 255) ** 2.2;
  return [ch((n >> 16) & 255), ch((n >> 8) & 255), ch(n & 255)];
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('createShader failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader error');
  return shader;
}

/**
 * Creates the 3D glass scene on `canvas`. Returns null when WebGL is missing or fails,
 * so the caller can show the 2D fallback. Resolution adapts to the device's speed.
 */
export function createScene(canvas: HTMLCanvasElement, host: HTMLElement): Scene | null {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'default' });
  if (!gl) return null;
  let program: WebGLProgram;
  try {
    program = gl.createProgram() as WebGLProgram;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link error');
  } catch {
    return null;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string): WebGLUniformLocation | null => gl.getUniformLocation(program, name);
  const loc = { res: u('uRes'), time: u('uTime'), yaw: u('uYaw'), pitch: u('uPitch'), rip: u('uRip'), offer: u('uOffer'), arm: u('uArm'), dark: u('uDark'), c: [u('uC0'), u('uC1'), u('uC2'), u('uC3')] };

  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const small = window.matchMedia('(max-width: 700px)');
  let quality = Math.min(window.devicePixelRatio || 1, small.matches ? 1.25 : 1.6) * (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 ? 0.8 : 1);
  let width = 0;
  let height = 0;

  const state = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, rip: 0, offer: 0, arm: 0, dir: 0 as -1 | 0 | 1, animT: 0, done: null as null | (() => void) };
  let visible = true;
  let running = false;
  let last = performance.now();
  let clock = 0;
  let frames = 0;
  let slow = 0;

  const resize = (): void => {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width * quality));
    height = Math.max(1, Math.round(rect.height * quality));
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  };

  const isDark = (): number => {
    const forced = document.documentElement.dataset['theme'];
    return forced === 'dark' || (forced !== 'light' && darkQuery.matches) ? 1 : 0;
  };

  const draw = (): void => {
    gl.uniform2f(loc.res, width, height);
    gl.uniform1f(loc.time, clock);
    gl.uniform1f(loc.yaw, state.yaw);
    gl.uniform1f(loc.pitch, state.pitch);
    gl.uniform1f(loc.rip, state.rip);
    gl.uniform1f(loc.offer, ease(state.offer));
    gl.uniform1f(loc.arm, ease(state.arm));
    gl.uniform1f(loc.dark, isDark());
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const step = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += calm.matches ? 0 : dt;
    // smooth pointer follow + a slow idle sway so it never looks frozen
    const sway = calm.matches ? 0 : Math.sin(clock * 0.45) * 0.07;
    const k = 1 - Math.exp(-dt * 6);
    state.yaw += (state.tYaw + sway - state.yaw) * k;
    state.pitch += (state.tPitch - state.pitch) * k;
    state.rip *= Math.exp(-dt * 1.6);
    if (state.dir !== 0) {
      state.animT += dt * state.dir;
      const t = state.animT;
      state.arm = clamp01(t / 0.95);
      state.offer = clamp01((t - 0.75) / 1.0);
      if (state.dir === 1 && state.offer >= 1) {
        state.dir = 0;
        const cb = state.done;
        state.done = null;
        cb?.();
      } else if (state.dir === -1 && t <= 0) {
        state.dir = 0;
        state.animT = 0;
      }
    }
    draw();
    // adaptive resolution: if frames are slow, render fewer pixels
    frames += 1;
    if (dt > 0.032) slow += 1;
    if (frames === 40) {
      if (slow > 18 && quality > 0.7) {
        quality *= 0.78;
        resize();
      }
      frames = 0;
      slow = 0;
    }
  };

  const loop = (now: number): void => {
    if (!running) return;
    step(now);
    if (calm.matches && state.dir === 0 && state.rip < 0.02) {
      running = false; // reduced motion: only draw when something changes
      return;
    }
    requestAnimationFrame(loop);
  };
  const wake = (): void => {
    if (running || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(loop);
  };

  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) wake();
    else running = false;
  });
  io.observe(host);
  const ro = new ResizeObserver(() => {
    resize();
    wake();
    if (!running) draw();
  });
  ro.observe(host);
  const onVisibility = (): void => { if (document.hidden) running = false; else wake(); };
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); running = false; });

  resize();
  wake();

  return {
    setDrink(layers) {
      layers.slice(0, 4).forEach((hex, i) => {
        const [r, g, b] = hexToLinear(hex);
        gl.uniform3f(loc.c[i] ?? null, r, g, b);
      });
      wake();
      if (!running) draw();
    },
    look(x, y) {
      state.tYaw = -x * 0.5;
      state.tPitch = -y * 0.12;
      wake();
    },
    ripple(amount) {
      state.rip = Math.min(1, state.rip + amount);
      wake();
    },
    offer(done) {
      state.done = done;
      if (calm.matches) {
        state.arm = 1; state.offer = 1; state.animT = 1.75; state.dir = 0;
        draw();
        done();
        return;
      }
      state.dir = 1;
      wake();
    },
    release() {
      state.done = null;
      if (calm.matches) { state.arm = 0; state.offer = 0; state.animT = 0; state.dir = 0; draw(); return; }
      state.dir = -1;
      if (state.animT <= 0) state.animT = 0.0001;
      wake();
    },
    dispose() {
      running = false;
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
