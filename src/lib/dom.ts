/**
 * Tiny, safe DOM builder. There is deliberately no way to inject HTML strings:
 * text always goes through text nodes, attributes are screened, URLs must be https.
 * (The CSP also enforces Trusted Types, so innerHTML would throw in supporting browsers.)
 */
export type Child = Node | string | number | null | undefined | false;
type AttrValue = string | number | boolean | null | undefined;

export interface Props {
  class?: string;
  attrs?: Readonly<Record<string, AttrValue>>;
  data?: Readonly<Record<string, string>>;
  on?: Readonly<Record<string, EventListener>>;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Event-handler attributes, inline style (blocked by CSP anyway) and other risky names. */
const FORBIDDEN_ATTR = /^(on|style$|srcdoc$|formaction$)/i;
const URL_ATTRS = new Set(['href', 'src', 'action', 'poster', 'xlink:href']);

/** Returns a normalized https URL, a same-page fragment, or null for anything else. */
export function safeUrl(input: string): string | null {
  if (input.startsWith('#')) return input;
  try {
    const url = new URL(input);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function setAttr(el: Element, name: string, value: AttrValue): void {
  if (value === null || value === undefined || value === false) return;
  if (FORBIDDEN_ATTR.test(name)) throw new Error(`Attribute "${name}" is not allowed`);
  let text = value === true ? '' : String(value);
  if (URL_ATTRS.has(name.toLowerCase())) {
    const safe = safeUrl(text);
    if (safe === null) throw new Error(`Unsafe URL for attribute "${name}"`);
    text = safe;
  }
  el.setAttribute(name, text);
}

function applyProps(el: Element, props: Props): void {
  if (props.class) el.setAttribute('class', props.class);
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) setAttr(el, k, v);
  if (props.data && el instanceof HTMLElement) {
    for (const [k, v] of Object.entries(props.data)) el.dataset[k] = v;
  }
  if (props.on) for (const [type, fn] of Object.entries(props.on)) el.addEventListener(type, fn);
}

export function append(parent: Node, children: readonly Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  applyProps(el, props);
  append(el, children);
  return el;
}

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  applyProps(el, props);
  append(el, children);
  return el;
}

/** Reference to a symbol in the inline sprite in index.html. */
export function icon(name: string, className = 'icon'): SVGSVGElement {
  return svg(
    'svg',
    { class: className, attrs: { 'aria-hidden': 'true', focusable: 'false' } },
    svg('use', { attrs: { href: `#i-${name}` } }),
  );
}

/** Replaces all children of `parent`. */
export function mount(parent: Element, ...children: Child[]): void {
  parent.replaceChildren();
  append(parent, children);
}

/** Query that throws a clear error instead of returning null. */
export function must<T extends Element>(
  selector: string,
  ctor: abstract new (...args: never[]) => T,
  root: ParentNode = document,
): T {
  const el = root.querySelector(selector);
  if (!(el instanceof ctor)) throw new Error(`Missing or wrong element for "${selector}"`);
  return el;
}

let uidCounter = 0;
export function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}-${uidCounter}`;
}
