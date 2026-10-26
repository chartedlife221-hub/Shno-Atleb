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
  if (!ok) failures += 1;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const problems: string[] = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text()); });
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

// dialog
await page.click('#cup-btn');
await page.waitForFunction(() => (document.getElementById('barista') as HTMLDialogElement).open, null, { timeout: 15000 }).catch(() => undefined);
check('barista dialog opens', await page.locator('#barista').evaluate((d: HTMLDialogElement) => d.open));
await page.waitForSelector('.barista__card.is-scene', { timeout: 5000 }).catch(() => undefined);
check('the card opens onto the video scene', await page.locator('.barista__card.is-scene').count() === 1);
await page.keyboard.press('Escape');
check('Esc closes the dialog', !(await page.locator('#barista').evaluate((d: HTMLDialogElement) => d.open)));

// search incl. Arabic spelling variants
await page.fill('#f-query', 'امريكانو');
await page.waitForTimeout(250);
const n = await page.locator('#grid > li').count();
check('Arabic search forgives alef spelling', n > 0 && n < 25, String(n));
await page.fill('#f-query', 'zzzzqq');
await page.waitForTimeout(250);
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

await browser.close();
server.stop();
if (failures > 0) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nAll e2e checks passed');
