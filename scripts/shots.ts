import { chromium } from 'playwright';
const [, , url = 'http://localhost:4173/', out = '/tmp/shots'] = process.argv;
const browser = await chromium.launch();
for (const [name, w, h, lang, scheme] of [['desk-ar', 1366, 900, 'ar', 'light'], ['mob-ar', 390, 844, 'ar', 'light'], ['desk-en-dark', 1366, 900, 'en', 'dark']] as const) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
  page.on('pageerror', (e) => console.log('page error:', e.message));
  await page.addInitScript((l) => localStorage.setItem('sa.lang', l), lang);
  await page.goto(url);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${out}-${name}.png` });
  for (let y = 0; y < 9000; y += 500) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(80); }
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}-${name}-full.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
