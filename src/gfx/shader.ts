/** Vertex shader: one oversized triangle covering the canvas. */
export const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/**
 * Fragment shader: a raymarched iced-coffee glass with refraction, condensation, ice, a straw,
 * and a barista hand that slides in and lifts the glass toward the viewer.
 * Output is premultiplied alpha so the page environment shows through the glass.
 */
export const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime, uYaw, uPitch, uRip, uOffer, uArm, uDark;
uniform vec3 uC0, uC1, uC2, uC3;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float sdCaps(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
float sdRBox(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }

// ---------- environment (what the glass reflects) ----------
vec3 env(vec3 rd) {
  vec3 low = mix(vec3(0.30, 0.38, 0.33), vec3(0.04, 0.07, 0.06), uDark);
  vec3 high = mix(vec3(0.95, 0.90, 0.80), vec3(0.20, 0.27, 0.24), uDark);
  vec3 c = mix(low, high, smoothstep(-0.3, 0.9, rd.y));
  float key = pow(max(dot(rd, normalize(vec3(-0.55, 0.5, 0.7))), 0.0), 14.0);
  float streak = smoothstep(0.07, 0.0, abs(rd.x + 0.42)) * smoothstep(0.05, 0.4, rd.z) * smoothstep(-0.4, 0.3, rd.y);
  float streak2 = smoothstep(0.03, 0.0, abs(rd.x - 0.5)) * smoothstep(0.05, 0.4, rd.z) * smoothstep(-0.2, 0.4, rd.y);
  c += vec3(1.0, 0.95, 0.85) * (key * 1.4 + streak * 4.5 + streak2 * 2.0);
  float rim = pow(max(dot(rd, normalize(vec3(0.85, 0.15, -0.45))), 0.0), 8.0);
  c += vec3(0.45, 0.65, 1.0) * rim * (0.7 + uDark * 0.8);
  return c;
}

// ---------- geometry ----------
float cupR(float y) { return mix(0.52, 0.70, clamp((y + 0.9) / 1.8, 0.0, 1.0)); }
float dGlass(vec3 p) { return max(length(p.xz) - cupR(p.y), abs(p.y) - 0.9); }
float liqTop(vec3 p) {
  float amp = 0.010 + uRip * 0.035;
  float t = 0.5 + amp * sin(p.x * 11.0 + uTime * 2.6) * sin(p.z * 9.0 - uTime * 2.1);
  t += amp * 0.7 * sin(length(p.xz) * 20.0 - uTime * 5.0) * uRip;
  return t;
}
float dLiq(vec3 p) { return max(length(p.xz) - (cupR(p.y) - 0.055), max(p.y - liqTop(p), -0.78 - p.y)); }
float dIce(vec3 p) {
  float d = 1e3;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec3 c = vec3(sin(fi * 2.1 + 1.0) * 0.26, 0.5 + 0.05 * sin(uTime * 0.9 + fi * 2.0), cos(fi * 2.1 + 1.0) * 0.22);
    vec3 q = p - c;
    q.xz = rot(uTime * 0.25 + fi) * q.xz;
    q.xy = rot(0.4 + fi) * q.xy;
    d = min(d, sdRBox(q, vec3(0.14), 0.045));
  }
  return d;
}
float dStraw(vec3 p) { return sdCaps(p, vec3(0.14, -0.7, 0.02), vec3(0.3, 1.3, -0.12), 0.042); }

vec3 armShift() { return (1.0 - uArm) * vec3(1.5, -0.5, -3.4); }
float dHand(vec3 p) {
  vec3 q = p - armShift();
  float d = (length((q - vec3(0.0, -1.0, 0.12)) / vec3(0.58, 0.075, 0.5)) - 1.0) * 0.075;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float x = -0.31 + fi * 0.205;
    float len = 0.55 + 0.12 * (1.0 - abs(fi - 1.5) / 1.5);
    d = smin(d, sdCaps(q, vec3(x, -1.0, 0.42), vec3(x * 1.08, -0.94, 0.42 + len), 0.062 - 0.004 * abs(fi - 1.5)), 0.06);
  }
  d = smin(d, sdCaps(q, vec3(-0.46, -1.0, 0.02), vec3(-0.74, -0.9, 0.4), 0.085), 0.07);
  d = smin(d, sdCaps(q, vec3(0.1, -1.02, -0.3), vec3(1.1, -1.4, -2.4), 0.2), 0.16);
  return d;
}
float dSleeve(vec3 p) { vec3 q = p - armShift(); return sdCaps(q, vec3(0.62, -1.2, -1.4), vec3(1.7, -1.75, -4.2), 0.34); }

vec2 mapOuter(vec3 p) {
  vec2 r = vec2(dGlass(p), 1.0);
  float s = max(dStraw(p), 0.88 - p.y);
  if (s < r.x) r = vec2(s, 2.0);
  if (uArm > 0.001) {
    float h = dHand(p); if (h < r.x) r = vec2(h, 3.0);
    float sl = dSleeve(p); if (sl < r.x) r = vec2(sl, 4.0);
  }
  return r;
}
vec2 mapInner(vec3 p) {
  vec2 r = vec2(dLiq(p), 1.0);
  float i = dIce(p); if (i < r.x) r = vec2(i, 2.0);
  float s = dStraw(p); if (s < r.x) r = vec2(s, 3.0);
  return r;
}
vec3 nrmOuter(vec3 p) {
  vec2 e = vec2(1.0, -1.0) * 0.004;
  return normalize(e.xyy * mapOuter(p + e.xyy).x + e.yyx * mapOuter(p + e.yyx).x + e.yxy * mapOuter(p + e.yxy).x + e.xxx * mapOuter(p + e.xxx).x);
}
vec3 nrmInner(vec3 p) {
  vec2 e = vec2(1.0, -1.0) * 0.004;
  return normalize(e.xyy * mapInner(p + e.xyy).x + e.yyx * mapInner(p + e.yyx).x + e.yxy * mapInner(p + e.yxy).x + e.xxx * mapInner(p + e.xxx).x);
}

vec3 liqCol(vec3 p) {
  float h = (p.y + 0.78) / 1.28;
  h += sin(p.x * 7.0 + p.z * 5.0 + uTime * 0.4) * 0.035 + sin(p.y * 20.0 + p.x * 4.0) * 0.012;
  vec3 c = uC3;
  c = mix(c, uC2, smoothstep(0.22, 0.34, h));
  c = mix(c, uC1, smoothstep(0.5, 0.62, h));
  c = mix(c, uC0, smoothstep(0.78, 0.9, h));
  return c;
}

const vec3 L = vec3(-0.45, 0.75, 0.5);

// What you see through the glass wall: liquid, ice, straw, or the (transparent) back.
vec4 inner(vec3 ro, vec3 rd) {
  float t = 0.0;
  float hit = -1.0;
  for (int i = 0; i < 44; i++) {
    vec2 m = mapInner(ro + rd * t);
    if (m.x < 0.003) { hit = m.y; break; }
    t += m.x * 0.9;
    if (t > 3.4) break;
  }
  if (hit < 0.0) return vec4(env(rd) * 0.8, 0.16);
  vec3 p = ro + rd * t;
  vec3 n = nrmInner(p);
  float dif = 0.5 + 0.5 * dot(n, normalize(L));
  if (hit < 1.5) {
    vec3 base = liqCol(p);
    float top = smoothstep(0.03, 0.0, abs(p.y - liqTop(p)));
    vec3 c = base * (0.45 + 0.75 * dif) + base * 0.25 * (1.0 - t * 0.18);
    c += pow(max(dot(reflect(rd, n), normalize(L)), 0.0), 40.0) * 0.5 * (0.4 + top);
    return vec4(c, 1.0);
  }
  if (hit < 2.5) {
    float f = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
    vec3 c = mix(vec3(0.75, 0.9, 1.0) * (0.45 + 0.6 * dif), env(reflect(rd, n)), f * 0.6);
    return vec4(c, 0.55 + 0.3 * f);
  }
  return vec4(vec3(0.85, 0.42, 0.25) * (0.4 + 0.7 * dif), 1.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  // camera orbits the glass a little with the pointer
  vec3 ro = vec3(0.0, 0.85, 8.2);
  ro.yz = rot(uPitch) * ro.yz;
  ro.xz = rot(uYaw) * ro.xz;
  vec3 ta = vec3(0.0, 0.0 - 0.1 * uOffer, 0.9 * uOffer);
  vec3 f = normalize(ta - ro);
  vec3 r = normalize(cross(f, vec3(0.0, 1.0, 0.0)));
  vec3 u = cross(r, f);
  vec3 rd = normalize(f * 2.6 + r * uv.x + u * uv.y);

  // the glass slides toward the viewer and lifts a little when offered
  vec3 off = vec3(0.0, 0.1 * uOffer, 1.9 * uOffer);
  ro -= off;

  // bounding sphere (bigger when the arm is in the scene)
  vec3 bc = mix(vec3(0.0, 0.1, 0.0), vec3(0.5, -0.4, -0.9), step(0.001, uArm));
  float br = mix(1.7, 3.4, step(0.001, uArm));
  vec3 oc = ro - bc;
  float bb = dot(oc, rd), cc = dot(oc, oc) - br * br, disc = bb * bb - cc;
  float tHit = -1.0, id = 0.0;
  if (disc > 0.0) {
    float t = max(-bb - sqrt(disc), 0.0);
    for (int i = 0; i < 72; i++) {
      vec2 m = mapOuter(ro + rd * t);
      if (m.x < 0.002) { tHit = t; id = m.y; break; }
      t += m.x * 0.85;
      if (t > 12.0) break;
    }
  }

  // soft contact shadow and colour spill on the surface the glass stands on
  float tp = (-0.95 - ro.y) / rd.y;
  vec4 bg = vec4(0.0);
  if (tp > 0.0) {
    vec2 g = (ro + rd * tp).xz;
    float lift = 1.0 - 0.7 * uOffer;
    float sh = exp(-dot(g, g) * 1.7) * 0.34 * lift + exp(-dot(g - vec2(0.45, -0.4), g - vec2(0.45, -0.4)) * 2.5) * 0.08 * lift;
    float spill = exp(-dot(g, g) * 2.2) * 0.22 * lift;
    vec3 spillCol = mix(uC1, uC2, 0.5);
    bg = vec4(vec3(0.05, 0.03, 0.02) * sh + spillCol * spill * 0.6, clamp(sh + spill * 0.5, 0.0, 0.7));
  }

  vec4 col = bg;
  if (tHit > 0.0) {
    vec3 p = ro + rd * tHit;
    vec3 n = nrmOuter(p);
    vec3 v = -rd;
    if (id < 1.5) {
      // condensation droplets
      float a = atan(p.z, p.x);
      vec2 cell = vec2(a * 3.4, p.y * 5.2);
      vec2 cid = floor(cell);
      vec2 fr = fract(cell) - 0.5;
      float hh = hash(cid);
      if (hh > 0.78 && p.y < 0.82) {
        vec2 o = (vec2(hash(cid + 3.0), hash(cid + 7.0)) - 0.5) * 0.35;
        vec2 gv = fr - o;
        float b = smoothstep(0.2 * (0.5 + hash(cid + 1.0)), 0.0, length(gv));
        vec3 T = vec3(-sin(a), 0.0, cos(a));
        n = normalize(n + (T * gv.x + vec3(0.0, 1.0, 0.0) * gv.y) * b * 2.4);
      }
      float F = 0.06 + 0.94 * pow(1.0 - max(dot(n, v), 0.0), 3.5);
      vec3 refl = env(reflect(rd, n));
      vec3 rf = refract(rd, n, 1.0 / 1.45);
      vec4 inn = inner(p + rf * 0.06, rf);
      vec3 rgb = inn.rgb * (1.0 - F) * 0.95 + refl * F * 1.25;
      rgb += pow(max(dot(reflect(rd, n), normalize(L)), 0.0), 90.0) * 1.2;
      rgb += vec3(0.5, 0.7, 1.0) * pow(1.0 - max(dot(n, v), 0.0), 3.0) * (0.25 + 0.35 * uDark);
      float al = clamp(inn.a * (1.0 - F) + F + 0.05, 0.0, 1.0);
      col = vec4(rgb * al, al);
      col = col + bg * (1.0 - al);
    } else if (id < 2.5) {
      float dif = 0.45 + 0.55 * dot(n, normalize(L));
      vec3 c = vec3(0.86, 0.45, 0.28) * dif + pow(max(dot(reflect(rd, n), normalize(L)), 0.0), 30.0) * 0.5;
      col = vec4(c, 1.0);
    } else if (id < 3.5) {
      float ao = clamp(mapOuter(p + n * 0.12).x / 0.12, 0.0, 1.0);
      float dif = clamp(dot(n, normalize(L)) * 0.55 + 0.5, 0.0, 1.0);
      vec3 skin = vec3(0.84, 0.58, 0.43);
      vec3 c = skin * (0.28 + 0.8 * dif) * (0.55 + 0.45 * ao);
      c += vec3(0.6, 0.18, 0.1) * pow(1.0 - max(dot(n, v), 0.0), 2.0) * 0.28;
      c += vec3(0.4, 0.6, 1.0) * pow(1.0 - max(dot(n, v), 0.0), 4.0) * 0.18;
      col = vec4(c, 1.0);
    } else {
      float dif = clamp(dot(n, normalize(L)) * 0.5 + 0.5, 0.0, 1.0);
      vec3 c = vec3(0.17, 0.12, 0.10) * (0.35 + 0.9 * dif);
      c += vec3(0.4, 0.55, 0.9) * pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.14;
      col = vec4(c, 1.0);
    }
  }
  vec3 rgb = pow(max(col.rgb / max(col.a, 0.001), 0.0), vec3(0.4545)) * col.a;
  // tiny dither hides banding in the soft gradients
  rgb += (hash(gl_FragCoord.xy + uTime) - 0.5) / 255.0 * col.a;
  gl_FragColor = vec4(rgb, col.a);
}
`;
