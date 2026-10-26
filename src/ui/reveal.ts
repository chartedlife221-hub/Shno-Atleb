/** Fades elements in as they scroll into view. Without IntersectionObserver or with reduced motion, all is visible. */
export function observeReveal(root: ParentNode): void {
  const els = root.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)');
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm || typeof IntersectionObserver === 'undefined') {
    for (const el of els) el.classList.add('is-in');
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  for (const el of els) io.observe(el);
}

/** Highlights the nav link of the section in view. */
export function scrollSpy(): void {
  const links = new Map<string, HTMLAnchorElement>();
  for (const a of document.querySelectorAll<HTMLAnchorElement>('.nav a[href^="#"]')) links.set(a.getAttribute('href')?.slice(1) ?? '', a);
  if (typeof IntersectionObserver === 'undefined') return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const [id, a] of links) {
          if (id === entry.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        }
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  for (const id of links.keys()) {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  }
}
