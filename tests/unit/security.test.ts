import { describe, expect, it } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const sources = readdirSync('src', { recursive: true })
  .filter((f) => f.endsWith('.ts'))
  .map((f) => ({ file: join('src', f), text: readFileSync(join('src', f), 'utf8') }));

const BANNED: [string, RegExp][] = [
  ['innerHTML', /\.innerHTML\b/],
  ['outerHTML', /\.outerHTML\b/],
  ['insertAdjacentHTML', /insertAdjacentHTML/],
  ['document.write', /document\.write/],
  ['eval', /\beval\s*\(/],
  ['new Function', /new\s+Function\s*\(/],
  ['string timers', /set(Timeout|Interval)\s*\(\s*['"`]/],
  ['inline style attribute', /setAttribute\(\s*['"]style['"]/],
  ['postMessage wildcard', /postMessage\([^)]*['"]\*['"]\)/],
  ['dangerouslySetInnerHTML', /dangerouslySetInnerHTML/],
];

describe('source code security rules', () => {
  it('finds source files to scan', () => {
    expect(sources.length).toBeGreaterThan(8);
  });
  for (const [name, pattern] of BANNED) {
    it(`never uses ${name}`, () => {
      for (const s of sources) {
        const stripped = s.text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
        expect(`${s.file}: ${pattern.test(stripped)}`).toBe(`${s.file}: false`);
      }
    });
  }

  it('index.html has no inline scripts, inline event handlers or inline styles', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>\s*\S/);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/\sstyle\s*=/i);
    expect(html).not.toMatch(/javascript:/i);
  });

  it('external links that open a new tab use rel=noopener noreferrer in the DOM helper callers', () => {
    for (const s of sources) {
      const mentionsBlank = /target:\s*'_blank'/.test(s.text);
      if (mentionsBlank) expect(s.text).toContain('noopener noreferrer');
    }
  });
});
