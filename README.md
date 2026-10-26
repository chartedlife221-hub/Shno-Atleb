# شنو أطلب؟ / Shno Atleb

**The exact order to get in Kuwait.** A curated, bilingual (AR/EN, RTL-aware) landing page for Kuwait's most-ordered coffee and dessert picks.

> Prototype: all items, prices and dates are placeholders pending verification. Not affiliated with or endorsed by any café.

## Run it

No build step.

| Method | Steps |
|---|---|
| Double-click | Open `index.html` |
| Local server | `python3 -m http.server 8000` then open http://localhost:8000 |

## Project structure

| Path | What it is |
|---|---|
| `index.html` | Page markup |
| `css/styles.css` | All styles (glass theme, hero scene, responsive) |
| `data/items.js` | **The items.** Edit/replace this to change content |
| `js/i18n.js` | Areas, categories, bilingual copy |
| `js/hero-art.js` | Hero drink layer colors, nav icons |
| `js/app.js` | Rendering, filters, search, carousel, forms |
| `assets/photos/` | Put real item photos here |
| `docs/` | One-pager, PRD + schema, 30-day content plan, open questions |
| `.github/workflows/pages.yml` | Auto-deploy to GitHub Pages on push to `main` |

## Editing content

Each item in `data/items.js` follows the schema in `docs/02-prd.md`:

| Key | Meaning |
|---|---|
| `ar` / `en` | exact order name |
| `cafe` / `cafe_ar` | brand name |
| `area`, `cat`, `price`, `badge` | see enums in the PRD |
| `r_ar` / `r_en` | one-line reason |
| `src`, `date` | required: source and `YYYY-MM-DD` verification date |
| `top` | 1–10 to appear in the hero carousel and Top 10 |

Rules: never publish an item without `src` and `date`. Items older than 60 days are tagged "needs recheck" automatically (`STALE_DAYS` in `js/i18n.js`).

## Real photos

Add images to `assets/photos/`, add an `image` key per item, then use it in `cardHTML()` (cards) and `updateHero()` (hero) in `js/app.js`.

## Make the forms real

The submit and waitlist forms only show a success state. Post their values to a form service (Formspree, Google Forms, Airtable, or a Zapier/Make webhook) in the `submit` handlers at the bottom of `js/app.js`.

## Deploy (GitHub Pages)

1. Push to `main`.
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. The included workflow publishes the site on every push.

## Brand rules

Never claim an "official best seller" (use Most-ordered pick, Local favorite, Staff pick, Cult favorite). Never imply partnership or endorsement. Arabic first, English second.
