# شنو أطلب؟ · Shno Atleb

Kuwait's exact coffee and dessert order, written on your cup. Arabic first, English too.

**Concept:** a frosted-glass café where you are *offered* a cup. Pick a mood; a real video of a barista's hand holds a cup inside a glass "portal". Hover and the cup leans toward you; touch it and the hand brings the cup right up to the screen (the frame lifts toward you in 3D), then a full-screen card shows the exact order to say at the counter. Plus a Top 10, searchable list, area map and forms to suggest or correct orders.

**The order hand-off (three stages):** touching the cup grows the order card out of it (stage 1: exact name, café, price in Arabic and English). The card then opens onto the café (stage 2: a background layer clipped by the card). Then a real hand brings that drink forward *out of* the card (stage 3): the hand and cup are a separate cut-out layer, drawn by WebGL above the card with extra perspective scale and a soft shadow, so they cross the card's edges while the background stays behind. The cut-outs were made from the real clips with segmentation models (see `tools/handoff/`).

**Matching drinks only:** the iced clip (its cup is printed "Ice Vanilla Americano") is used only for that order; the layered glass clip only for the Iced Spanish Latte; the whipped-cream glass only for the Caramel Frappuccino; the ceramic rose cup only for the Rose Latte; the cinnamon-dusted white cup only for the Honey Cinnamon Latte; the plain white takeaway cup is used only for hot drinks. Iced lattes, matcha, frappés and desserts have no footage yet, so they show the empty café counter and a note, never a different cup (unit-tested in `tests/unit/clips.test.ts`). Reduced motion, data saver or no WebGL show the same composition as still images.

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
