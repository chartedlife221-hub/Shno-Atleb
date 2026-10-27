"""Generates the sunlit lime-plaster wall used behind the site (run once; outputs go to public/media).

bg-plaster.jpg  seamless, neutral luminance texture (multiplied over the theme's wall colour)
bg-sun.webp     the patch of window light on the wall (white, soft penumbra), 16:9
bg-leaves-a/b   shadows of a plant's branches, cast inside that light, two depths for parallax sway
"""
import numpy as np, cv2, sys
from PIL import Image
rng = np.random.default_rng(7)
OUT = sys.argv[1] if len(sys.argv) > 1 else 'public/media'

def periodic_noise(n, scale, aniso=1.0, angle=0.0):
    """Tileable band-limited noise via FFT filtering."""
    w = rng.standard_normal((n, n))
    f = np.fft.fft2(w)
    ky = np.fft.fftfreq(n)[:, None]; kx = np.fft.fftfreq(n)[None, :]
    c, s = np.cos(angle), np.sin(angle)
    u = kx * c + ky * s; v = (-kx * s + ky * c) * aniso
    k = np.sqrt(u * u + v * v) * n
    filt = np.exp(-(k / scale) ** 2)
    r = np.real(np.fft.ifft2(f * filt))
    return (r - r.mean()) / (r.std() + 1e-9)

# ---------- plaster tile ----------
N = 1536
lum = (0.45 * periodic_noise(N, 6) +           # broad limewash clouds
       0.30 * periodic_noise(N, 22) +
       0.20 * periodic_noise(N, 60, aniso=3.0, angle=0.5) +   # trowel strokes
       0.12 * periodic_noise(N, 160, aniso=2.0, angle=-0.7) +
       0.10 * periodic_noise(N, 700))          # fine sand grain
lum = (lum - lum.mean()) / lum.std()
# light catches the raised trowel ridges: a gentle emboss from the upper right
ridge = periodic_noise(N, 40, aniso=2.5, angle=0.4)
gy, gx = np.gradient(ridge)
emb = (gx * -0.6 + gy * 0.8); emb /= emb.std()
tex = 0.95 + 0.011 * lum + 0.007 * emb + 0.006 * periodic_noise(N, 900)
tex = np.clip(tex, 0.82, 1.0)
rgb = np.dstack([tex, tex * 0.995, tex * 0.985])
cv2.imwrite(f'{OUT}/bg-plaster.jpg', (rgb[..., ::-1] * 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 80])

# ---------- window light ----------
W, H = 2400, 1350
def soft(mask, base, spread):
    """Penumbra grows with distance from the window (towards the bottom-left)."""
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.clip(((W - xx) / W) * 0.6 + (yy / H) * 0.4, 0, 1)
    a = cv2.GaussianBlur(mask, (0, 0), base)
    b = cv2.GaussianBlur(mask, (0, 0), base + spread)
    return a * (1 - d) + b * d

sun = np.zeros((H, W), np.float32)
# a tall two-leaf window, projected on the wall as a sheared quad (sun from the upper right)
def quad(pts):
    m = np.zeros((H, W), np.float32)
    cv2.fillPoly(m, [np.array(pts, np.int32)], 1.0, lineType=cv2.LINE_AA)
    return m
def lerp(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
TL, TR, BR, BL = (1180, -60), (2280, 40), (1720, 1450), (560, 1350)
cols, rows = 2, 3
mull = 0.026
for i in range(cols):
    for j in range(rows):
        u0, u1 = i / cols + mull / 2, (i + 1) / cols - mull / 2
        v0, v1 = j / rows + mull / 2, (j + 1) / rows - mull / 2
        def P(u, v):
            top = lerp(TL, TR, u); bot = lerp(BL, BR, u)
            return lerp(top, bot, v)
        sun = np.maximum(sun, quad([P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)]))
sun = soft(sun, 9, 46)
# a second, smaller pane of light lower left, bounced and very soft
sun = np.maximum(sun, 0.35 * cv2.GaussianBlur(quad([(120, 980), (520, 1010), (380, 1350), (-40, 1350)]), (0, 0), 40))
Image.fromarray(np.dstack([np.full((H, W, 3), 255, np.uint8), (np.clip(sun, 0, 1) * 255).astype(np.uint8)]), 'RGBA').resize((1600, 900), Image.LANCZOS).save(f'{OUT}/bg-sun.webp', quality=82, method=6)

# ---------- leaf shadows ----------
def leaf(img, x, y, length, width, ang):
    pts = []
    for t in np.linspace(0, 1, 40):
        r = width * np.sin(np.pi * t) ** 0.8 * (1 - 0.25 * t)
        pts.append((t * length, r))
    poly = pts + [(p[0], -p[1]) for p in reversed(pts)]
    c, s = np.cos(ang), np.sin(ang)
    poly = [(x + px * c - py * s, y + px * s + py * c) for px, py in poly]
    cv2.fillPoly(img, [np.array(poly, np.int32)], 1.0, lineType=cv2.LINE_AA)

def branch(img, x, y, ang, length, n, leaf_len, curve, thick=7):
    pts = [(x, y)]
    a = ang
    for k in range(1, 60):
        a += curve / 60
        x += np.cos(a) * length / 60; y += np.sin(a) * length / 60
        pts.append((x, y))
    cv2.polylines(img, [np.array(pts, np.int32)], False, 1.0, thick, lineType=cv2.LINE_AA)
    for k in range(n):
        t = 0.12 + 0.88 * k / max(1, n - 1)
        px, py = pts[int(t * 59)]
        side = 1 if k % 2 else -1
        la = ang + curve * t + side * (0.75 + rng.uniform(-0.25, 0.25))
        L = leaf_len * (0.7 + 0.5 * rng.random()) * (1.1 - 0.4 * t)
        stem = 14
        sx, sy = px + np.cos(la) * stem, py + np.sin(la) * stem
        cv2.line(img, (int(px), int(py)), (int(sx), int(sy)), 1.0, 3, cv2.LINE_AA)
        leaf(img, sx, sy, L, L * 0.2, la)
    leaf(img, pts[-1][0], pts[-1][1], leaf_len * 0.8, leaf_len * 0.16, ang + curve)

near = np.zeros((H, W), np.float32); far = np.zeros((H, W), np.float32)
branch(near, 2520, 120, np.pi * 0.84, 1250, 16, 260, 0.55, 11)
branch(near, 2480, 700, np.pi * 0.95, 980, 13, 240, -0.4, 10)
branch(near, 2200, -80, np.pi * 0.62, 700, 9, 220, 0.5, 9)
branch(far, 2440, 380, np.pi * 0.8, 1100, 15, 170, 0.7, 7)
branch(far, 2500, 1100, np.pi * 1.04, 900, 12, 170, 0.45, 7)
branch(far, 1900, -60, np.pi * 0.55, 620, 9, 150, -0.3, 6)
near = cv2.GaussianBlur(near, (0, 0), 8)   # nearer the window: softer
far = cv2.GaussianBlur(far, (0, 0), 3)
for name, m, op in (('a', near, 0.9), ('b', far, 0.75)):
    a = (np.clip(m * op, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(np.dstack([np.zeros((H, W, 3), np.uint8), a]), 'RGBA').resize((1800, 1013), Image.LANCZOS).save(f'{OUT}/bg-leaves-{name}.webp', quality=80, method=6)
print('ok')
