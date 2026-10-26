// Production build: bundle with Bun, prerender Arabic text, inject a strict CSP, copy static files and fonts.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ar } from '../src/lib/dictionary.ts';

const root = join(import.meta.dir, '..');
const dist = join(root, 'dist');

function formEndpoint(): string {
  const raw = (process.env['FORM_ENDPOINT'] ?? '').trim();
  if (raw === '') return '';
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('FORM_ENDPOINT must be an https URL');
  return url.href;
}

const escapeHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tr = (key: string): string => (ar as Record<string, string>)[key] ?? '';

/** Matches an attribute value, quoted or not (Bun's HTML minifier may drop quotes). */
const attr = (name: string): RegExp => new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>"']+))`);
const attrValue = (m: RegExpExecArray | null): string | null => (m ? (m[1] ?? m[2] ?? m[3] ?? null) : null);

function prerender(html: string): string {
  // Text content: <tag ... data-i18n="key" ...>fallback</tag> (leaf elements only).
  let out = html.replace(/<([a-z0-9]+)([^>]*\sdata-i18n=[^>]*)>([^<]*)<\/\1>/g, (whole, tag: string, attrs: string) => {
    const key = attrValue(attr('data-i18n').exec(attrs));
    return key && key in ar ? `<${tag}${attrs}>${escapeHtml(tr(key))}</${tag}>` : whole;
  });
  // Attributes: data-i18n-placeholder and data-i18n-aria-label.
  out = out.replace(/<[a-z0-9]+\s[^>]*data-i18n-(?:placeholder|aria-label)=[^>]*>/g, (tag) => {
    let next = tag;
    for (const [data, target] of [['data-i18n-placeholder', 'placeholder'], ['data-i18n-aria-label', 'aria-label']] as const) {
      const key = attrValue(attr(data).exec(next));
      if (!key || !(key in ar)) continue;
      const value = `${target}="${escapeHtml(tr(key))}"`;
      next = attr(target).test(next) ? next.replace(attr(target), ` ${value}`) : next.replace(/^<([a-z0-9]+)/, `<$1 ${value}`);
    }
    return next;
  });
  return out;
}

function csp(endpoint: string): string {
  const connect = endpoint === '' ? "'self'" : `'self' ${new URL(endpoint).origin}`;
  return [
    "default-src 'self'", "script-src 'self'", "style-src 'self'", "img-src 'self'", "font-src 'self'",
    `connect-src ${connect}`, "form-action 'self'", "base-uri 'self'", "object-src 'none'", "frame-src 'none'",
    "worker-src 'none'", "manifest-src 'self'", "require-trusted-types-for 'script'", 'upgrade-insecure-requests',
  ].join('; ');
}

const FONTS: readonly { pkg: string; css: readonly string[] }[] = [
  { pkg: 'ibm-plex-sans-arabic', css: ['400.css', '500.css', '600.css', '700.css'] },
];

/** Self-hosts fonts when @fontsource packages are installed; otherwise the CSS falls back to system fonts. */
function copyFonts(): string[] {
  const links: string[] = [];
  for (const { pkg, css } of FONTS) {
    const from = join(root, 'node_modules', '@fontsource', pkg);
    if (!existsSync(from)) continue;
    const to = join(dist, 'fonts', pkg);
    mkdirSync(to, { recursive: true });
    cpSync(join(from, 'files'), join(to, 'files'), { recursive: true });
    for (const file of css) {
      if (!existsSync(join(from, file))) continue;
      cpSync(join(from, file), join(to, file));
      links.push(`<link rel="stylesheet" href="./fonts/${pkg}/${file}">`);
    }
  }
  return links;
}

export function assertNoInlineCode(html: string): void {
  const problems: string[] = [];
  if (/<script(?![^>]*\ssrc=)[^>]*>\s*\S/i.test(html)) problems.push('inline <script>');
  if (/<style[\s>]/i.test(html)) problems.push('inline <style>');
  if (/\son[a-z]+\s*=/i.test(html)) problems.push('inline event handler');
  if (/\sstyle\s*=/i.test(html)) problems.push('inline style attribute');
  if (/javascript:/i.test(html)) problems.push('javascript: URL');
  if (problems.length) throw new Error(`Build output breaks the CSP: ${problems.join(', ')}`);
}

async function main(): Promise<void> {
  const endpoint = formEndpoint();
  rmSync(dist, { recursive: true, force: true });
  const result = await Bun.build({
    entrypoints: [join(root, 'index.html')],
    outdir: dist,
    minify: true,
    target: 'browser',
    publicPath: './',
    naming: { entry: '[name].[ext]', chunk: 'assets/[name]-[hash].[ext]', asset: 'assets/[name]-[hash].[ext]' },
    define: { __FORM_ENDPOINT__: JSON.stringify(endpoint) },
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error('Bundling failed');
  }
  cpSync(join(root, 'public'), dist, { recursive: true });
  const fontLinks = copyFonts();

  const file = join(dist, 'index.html');
  let html = prerender(readFileSync(file, 'utf8'));
  html = html.replace(/<meta charset="utf-8">/i, `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp(endpoint)}"><link rel="manifest" href="./manifest.webmanifest">`);
  if (fontLinks.length) html = html.replace(/<\/head>/i, `${fontLinks.join('')}</head>`);
  assertNoInlineCode(html);
  writeFileSync(file, html);
  writeFileSync(join(dist, '.nojekyll'), '');

  const files = readdirSync(dist, { recursive: true }).length;
  console.log(`Built ${files} files into dist/ (form endpoint: ${endpoint || 'none, demo mode'}; fonts: ${fontLinks.length ? 'self-hosted' : 'system fallback'})`);
}

if (import.meta.main) await main();
