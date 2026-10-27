// End-to-end checks in real Chromium against dist/. Run `bun run build` first.
import { join } from 'node:path';
import { chromium } from 'playwright';

const dist = join(import.meta.dir, '..', 'dist');
const server = Bun.serve({
  port: 0,
  async fetch(req) {
    const p = new URL(req.url).pathname;
    const f = Bun.file(join(dist, p === '/' ? 'index.html' : p.split('/').filter((x) => x && x !== '..').join('/')));
    return (await f.exists()) ? new Response(f) : new Response('nf', { status: 404 });
  },
});
const base = `http://localhost:${server.port}/`;

let failures = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : ` -> ${detail}`}`);
  if (!ok) {
    failures += 1;
    if (process.env['GITHUB_ACTIONS']) console.log(`::error title=e2e::${name}${detail ? ` -> ${detail}` : ''}`);
  }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const problems: string[] = [];
page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('GL Driver Message')) problems.push(m.text()); });
page.on('pageerror', (e) => problems.push(e.message));
await page.addInitScript(() => {
  (window as unknown as { __csp: string[] }).__csp = [];
  document.addEventListener('securitypolicyviolation', (e) => (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
});
await page.goto(base);
await page.waitForSelector('body.is-ready');

check('page is Arabic and RTL by default', (await page.getAttribute('html', 'dir')) === 'rtl' && (await page.getAttribute('html', 'lang')) === 'ar');
check('renders every item card', (await page.locator('#grid > li').count()) === 25);
check('renders a Top 10 rail', (await page.locator('#top-list > li').count()) === 10);
check('hero shows a real-video portal', (await page.locator('video.is-on').count()) === 1);
await page.waitForFunction(() => (document.querySelector('video.is-on') as HTMLVideoElement).readyState >= 2, null, { timeout: 10000 }).catch(() => undefined);
check('video has loaded a frame', (await page.evaluate(() => (document.querySelector('video.is-on') as HTMLVideoElement).readyState)) >= 2);
await page.hover('#cup-btn');
await page.waitForTimeout(900);
check('hovering leans the cup toward you', Number.parseFloat(await page.evaluate(() => document.getElementById('portal')!.style.getPropertyValue('--s'))) > 1.01);
check('an order is shown', ((await page.locator('#o-name').textContent()) ?? '').length > 2);

// mood + shuffle never repeats
const names = new Set<string>();
for (let i = 0; i < 4; i += 1) {
  await page.click('#shuffle-btn');
  await page.waitForTimeout(60);
  names.add((await page.locator('#o-name').textContent()) ?? '');
}
check('shuffle changes the pick', names.size >= 3, [...names].join(' | '));
await page.click('#moods button >> nth=2');
check('mood chip is pressed', (await page.locator('#moods button[aria-pressed="true"]').count()) === 1);

// dialog: the full three-stage hand-off on a drink that has footage
for (let i = 0; i < 40 && (await page.getAttribute('#portal', 'data-clip')) === 'none'; i += 1) await page.click('#shuffle-btn');
await page.waitForTimeout(1200);
const heroBefore = await page.evaluate(() => (document.querySelector('video.is-on') as HTMLVideoElement).currentTime);
await page.click('#cup-btn');
await page.waitForTimeout(400);
check('stage 0: touching the cup plays the real arm movement before the card opens', (await page.evaluate(() => (document.querySelector('video.is-on') as HTMLVideoElement).currentTime)) > heroBefore + 0.1);
await page.waitForFunction(() => (document.getElementById('barista') as HTMLDialogElement).open, null, { timeout: 15000 }).catch(() => undefined);
check('barista dialog opens', await page.locator('#barista').evaluate((d: HTMLDialogElement) => d.open));
await page.waitForSelector('.barista__card.is-scene', { timeout: 5000 }).catch(() => undefined);
check('the card opens onto the video scene', await page.locator('.barista__card.is-scene').count() === 1);
const heroName = (await page.locator('#o-name').textContent()) ?? '';
check('the card says it is sample data', await page.locator('#dlg-demo').isVisible());
check('the card shows the order the visitor touched', ((await page.locator('#dlg-name-ar').textContent()) ?? '') === heroName || ((await page.locator('#dlg-name').textContent()) ?? '') === heroName);
await page.waitForSelector('.barista__card.is-handoff', { timeout: 30000 }).catch(() => undefined);
check('stage 3: the hand-off starts', await page.locator('.barista__card.is-handoff').count() === 1);
await page.waitForFunction(() => Number(document.getElementById('ho-fg')?.dataset['bottom'] || 0) > 0, null, { timeout: 15000 }).catch(() => undefined);
await page.waitForFunction(() => {
  const card = document.querySelector('.barista__card')!.getBoundingClientRect();
  return Number(document.getElementById('ho-fg')!.dataset['bottom'] || 0) - card.bottom > 20;
}, null, { timeout: 30000 }).catch(() => undefined);
const breakout = await page.evaluate(() => {
  const card = document.querySelector('.barista__card')!.getBoundingClientRect();
  return Number(document.getElementById('ho-fg')!.dataset['bottom'] || 0) - card.bottom;
});
check('the hand and drink cross the card edge toward the viewer', breakout > 20, `${breakout}px`);
await page.keyboard.press('Escape');
check('Esc closes the dialog', !(await page.locator('#barista').evaluate((d: HTMLDialogElement) => d.open)));

// a drink with no footage never shows a different cup
await page.locator('#grid li[data-id="iced-matcha-latte"] .tbtn--main').click();
await page.waitForTimeout(1500);
check('no footage: honest note, no hand-off', (await page.locator('#dlg-note').isVisible()) && (await page.locator('.barista__card.is-handoff').count()) === 0);
await page.keyboard.press('Escape');

// search incl. Arabic spelling variants
await page.fill('#f-query', 'امريكانو');
await page.waitForFunction(() => document.querySelectorAll('#grid > li').length < 25, null, { timeout: 5000 }).catch(() => undefined);
const n = await page.locator('#grid > li').count();
check('Arabic search forgives alef spelling', n > 0 && n < 25, String(n));
await page.fill('#f-query', 'zzzzqq');
await page.waitForFunction(() => document.querySelectorAll('#grid > li').length === 0, null, { timeout: 5000 }).catch(() => undefined);
check('empty state shows', await page.locator('#empty').isVisible());
await page.click('#f-clear');
check('clear restores all', (await page.locator('#grid > li').count()) === 25);

// map pin filters by area
await page.locator('.pin').first().click();
check('map pin filters the list', (await page.locator('#grid > li').count()) < 25);
await page.click('#f-clear');

// language toggle
await page.click('#lang-btn');
check('switches to English LTR', (await page.getAttribute('html', 'dir')) === 'ltr' && (await page.getAttribute('html', 'lang')) === 'en');
check('English copy rendered', ((await page.locator('#hero-title').textContent()) ?? '').toLowerCase().includes('order'), (await page.locator('#hero-title').textContent()) ?? '');

// forms validate and, in demo mode, never send
let posted = false;
page.on('request', (r) => { if (r.method() === 'POST') posted = true; });
await page.click('#suggest-form button[type=submit]');
check('empty suggestion shows errors', (await page.locator('#suggest-form [aria-invalid="true"]').count()) > 0);
await page.fill('#wait-form input[name=contact]', 'nope');
await page.waitForTimeout(1600);
await page.click('#wait-form button[type=submit]');
check('bad contact is rejected', ((await page.locator('#wait-contact-err').textContent()) ?? '') !== '');
await page.fill('#wait-form input[name=contact]', 'me@example.com');
await page.click('#wait-form button[type=submit]');
await page.waitForTimeout(300);
check('demo mode says nothing was sent', ((await page.locator('#wait-result').textContent()) ?? '').length > 10);
check('demo mode makes no network POST', !posted);

// accessibility basics
check('every button has an accessible name', await page.evaluate(() => [...document.querySelectorAll('button, a[href]')].every((el) => (el.textContent ?? '').trim() !== '' || el.getAttribute('aria-label'))));
check('no duplicate ids', await page.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); return new Set(ids).size === ids.length; }));
check('no horizontal overflow (desktop)', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
await page.setViewportSize({ width: 360, height: 740 });
check('no horizontal overflow (360px phone)', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));

// security
const csp = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
check('no CSP or Trusted Types violations', csp.length === 0, csp.join(', '));
check('CSP meta is present', ((await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')) ?? '').includes("script-src 'self'"));
check('no console errors or warnings', problems.length === 0, problems.join(' | '));
check('external links use noopener noreferrer', await page.evaluate(() => [...document.querySelectorAll('a[target="_blank"]')].every((a) => (a.getAttribute('rel') ?? '').includes('noopener') && (a.getAttribute('rel') ?? '').includes('noreferrer'))));

// the HTML must already be readable Arabic before any JavaScript runs
const bare = await (await browser.newContext({ javaScriptEnabled: false })).newPage();
await bare.goto(base);
check('without JavaScript the page is already Arabic (no placeholders)', ((await bare.locator('#hero-title').textContent()) ?? '') === 'شنو أطلب؟' && !((await bare.locator('body').innerText()).includes('Sub')));

// ---------- resilience: each scenario in a fresh phone-sized context ----------
const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
async function openFilmed(p: import('playwright').Page): Promise<void> {
  await p.goto(base);
  await p.waitForSelector('body.is-ready');
  for (let i = 0; i < 40 && (await p.getAttribute('#portal', 'data-clip')) === 'none'; i += 1) await p.click('#shuffle-btn');
  await p.waitForTimeout(800);
}
const stageOf = (p: import('playwright').Page): Promise<string | null> => p.getAttribute('.barista__card', 'data-stage');

{ // rapid taps: one presentation, no errors
  const c = await browser.newContext(phone); const p = await c.newPage(); const errs: string[] = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await openFilmed(p);
  for (let i = 0; i < 6; i += 1) await p.locator('#cup-btn').tap({ force: true }).catch(() => undefined);
  await p.waitForTimeout(2500);
  check('rapid taps open the order once, without errors', (await p.locator('dialog[open]').count()) === 1 && errs.length === 0, errs.join(' | '));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  check('after closing, the cup can be touched again', await p.locator('#barista').evaluate((d: HTMLDialogElement) => !d.open));
  await c.close();
}
{ // hand-off video fails to load: still images, never stuck
  const c = await browser.newContext(phone); const p = await c.newPage();
  await p.route(/handoff-[a-z]+\.(mp4|webm)$/, (r) => r.abort());
  await openFilmed(p);
  await p.locator('#cup-btn').tap();
  await p.waitForFunction(() => document.querySelector('.barista__card')?.getAttribute('data-stage') === '3', null, { timeout: 8000 }).catch(() => undefined);
  check('video failure: falls back to the still hand-off within seconds', (await stageOf(p)) === '3' && await p.locator('#ho-fg-img').isVisible());
  await c.close();
}
{ // network offline after load: hero still works from its poster
  const c = await browser.newContext(phone); const p = await c.newPage();
  await openFilmed(p);
  await c.setOffline(true);
  await p.locator('#cup-btn').tap();
  await p.waitForFunction(() => document.querySelector('.barista__card')?.getAttribute('data-stage') === '3', null, { timeout: 10000 }).catch(() => undefined);
  check('offline: the order still opens and finishes', (await stageOf(p)) === '3' && ((await p.locator('#dlg-price').textContent()) ?? '').length > 2);
  await c.close();
}
{ // reduced motion: no video is downloaded for the hand-off, still images instead
  const c = await browser.newContext({ ...phone, reducedMotion: 'reduce' }); const p = await c.newPage(); const media: string[] = [];
  p.on('request', (r) => { if (/handoff-[a-z]+\.(mp4|webm)$/.test(r.url())) media.push(r.url()); });
  await openFilmed(p);
  await p.locator('#cup-btn').tap();
  await p.waitForTimeout(1200);
  check('reduced motion: still hand-off, no hand-off video downloaded', (await stageOf(p)) === '3' && await p.locator('#ho-fg-img').isVisible() && media.length === 0, media.join(','));
  await c.close();
}
{ // short phone screen, English LTR: everything important stays on screen
  const c = await browser.newContext({ ...phone, viewport: { width: 360, height: 640 } }); const p = await c.newPage();
  await openFilmed(p);
  await p.click('#lang-btn');
  check('English layout is LTR', (await p.getAttribute('html', 'dir')) === 'ltr');
  await p.locator('#cup-btn').tap();
  await p.waitForFunction(() => document.querySelector('.barista__card')?.getAttribute('data-stage') === '3', null, { timeout: 15000 }).catch(() => undefined);
  const fits = await p.evaluate(() => ['#dlg-close', '#dlg-copy', '#dlg-name', '#dlg-price'].every((s) => {
    const r = document.querySelector(s)!.getBoundingClientRect();
    return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
  }));
  check('360x640: close, copy, name and price stay visible', fits);
  check('English order name shown in the card', ((await p.locator('#dlg-name').textContent()) ?? '').length > 2);
  await c.close();
}
const noGl = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
{ // no WebGL: still hand-off
  const c = await noGl.newContext(phone); const p = await c.newPage();
  await openFilmed(p);
  await p.locator('#cup-btn').tap();
  await p.waitForFunction(() => document.querySelector('.barista__card')?.getAttribute('data-stage') === '3', null, { timeout: 8000 }).catch(() => undefined);
  check('no WebGL: still hand-off is shown', (await stageOf(p)) === '3' && await p.locator('#ho-fg-img').isVisible());
  await c.close();
}
await noGl.close();

await browser.close();
server.stop();
if (failures > 0) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nAll e2e checks passed');
