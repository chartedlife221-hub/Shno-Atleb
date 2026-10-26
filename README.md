# شنو أطلب؟ · Shno Atleb

Kuwait's exact coffee and dessert order, written on your cup. Arabic first, English too.

**Concept:** pick a mood, a paper cup gets the order handwritten on its sleeve, tap "show the barista" for a full-screen card to read out at the counter. Plus a Top 10, searchable list, area map, and forms to suggest/correct orders.

## Run

```bash
bun install        # dev tools + self-hosted fonts (typescript, playwright, @fontsource/*)
bun run dev        # build and serve on http://localhost:4173
bun run check      # typecheck + unit tests + build + e2e
```

## Structure

- `src/data/items.ts` — the orders (**placeholder data**: replace with verified rows, see `docs/02-prd.md`)
- `src/lib/` — pure, typed, unit-tested logic (filters, freshness, picking, validation, i18n, safe DOM helpers)
- `src/ui/` — components; `src/styles/main.css` — design tokens, light/dark, RTL via logical properties
- `scripts/build.ts` — Bun bundle, Arabic prerender, CSP injection, output assertions
- `tests/unit`, `scripts/e2e.ts` — 60+ unit tests and real-browser checks (CSP violations, a11y basics, flows)

## Real forms

Set the repository variable `FORM_ENDPOINT` (an https URL, e.g. a Formspree-style or your own function). Without it the forms show a "demo, nothing sent" note. The endpoint must validate again server-side.

## Deploy

Push to `main`: GitHub Actions runs checks and deploys to GitHub Pages (Settings → Pages → Source: GitHub Actions).

## Data rules

Every item needs a source and a `dateVerified`; items older than 60 days show "needs recheck". Never claim "official best seller".

Project docs: `docs/`. Security: `SECURITY.md`. License: MIT.
