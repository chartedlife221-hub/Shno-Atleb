# Open Questions & Assumptions

## Assumptions (made so work could proceed)

| # | Assumption | Impact if wrong |
|---|---|---|
| A1 | Accent color is terracotta (`#B5532F`), not date-palm green | One CSS variable change |
| A2 | Arabic is the default language; user choice is remembered in the browser | Flip `lang` default |
| A3 | Prototype data (items, prices, cafés, dates) is invented placeholder; "Local Roaster A/B/C" stand in for real local brands | Must be replaced with verified data before launch |
| A4 | "Drink type" filter = Coffee / Matcha & other / Dessert (separate from the 5 category chips) | Redefine in `typeOf()` |
| A5 | Price bands: under 1.500 / 1.500–2.000 / over 2.000 KD | Edit `priceBand()` |
| A6 | Map links are Google Maps *search* links by café + area; real per-branch links come with verified data | Add `map_url` per item |
| A7 | Forms are front-end only; no backend, no data saved | Pick a form backend (see README) |
| A8 | One café-brand entry per item, not per branch; area is the main branch or most-cited branch | May need a branches table if brands span areas |
| A9 | Item badges are community/staff-derived labels, never "official" | Keep, per brand rules |
| A10 | Currency shown as KD / د.ك with 3 decimals | n/a |
| A11 | Social handles in the footer are placeholders (`#`) | Update once accounts exist |
| A12 | Name check (domain, handles, trademark) is not yet done | See Q1 |

## Open questions

| # | Question | Why it matters | Needed by |
|---|---|---|---|
| Q1 | Are shnoatleb.com / shnuatleb.com and @shnoatleb / @shnoatleb.kw available? Has a Kuwait trademark search been done for the name? | Blocks branding and launch | Day 1–2 |
| Q2 | Which 15 cafés for the first data run, and which areas get priority? | Drives the 25-item list and the first Reels | Day 3 |
| Q3 | Staff interviews: do you have permission approach (script, in-person only, or also DM)? | Source quality and brand-friendliness | Week 1 |
| Q4 | How do you want to treat a café that objects to being listed? Remove within X days? | Risk and trust | Before launch |
| Q5 | Photos: will you shoot your own, or use café-supplied/with-permission photos? Placeholder gradients can't ship. | Image rights; card quality | Before launch |
| Q6 | Where will the master data live (Airtable vs Notion), and who updates it weekly? | 60-day recheck rule needs an owner | Week 1 |
| Q7 | Should the site be Arabic-only at launch, or fully bilingual as in the prototype? | Content workload | Before launch |
| Q8 | WhatsApp vs email for the waitlist: which is primary, and is there a business number for it? | Form backend and follow-up channel | Week 2 |
| Q9 | Hosting preference (e.g. Netlify, Cloudflare Pages, GitHub Pages)? Budget ceiling? | Setup and cost | Week 2 |
| Q10 | Analytics: privacy-friendly (Plausible, Umami) or Google Analytics? | Measuring filter usage and signups | Week 2 |
| Q11 | Do you want a per-item "share" button (WhatsApp/Instagram) in v1? | High value for virality, small build | Before launch |
| Q12 | Any categories to add early (e.g. Kuwaiti karak, Arabic coffee, seasonal drinks)? | Local relevance; schema enum change | Before launch |
| Q13 | Is delivery-app affiliate linking in scope for launch or after v1? | Disclosure labeling and revenue timing | After v1 |
| Q14 | Who answers corrections and submissions, and within what time? | Trust and freshness | Before launch |
| Q15 | Any legal/compliance review needed for the disclaimer and the "community-sourced" claim wording? | Brand disputes | Before launch |

## What I'd need from you to finalize

1. Name/handle/domain decision (Q1).
2. The café and area shortlist (Q2).
3. Photo approach (Q5).
4. A data backend decision (Q6, Q8).

## Flagged during the build

- Real café names appear in placeholder data with invented items and prices. They must not be published as verified claims; the banner and footer disclaimer already say so.
- Two sample items are intentionally dated more than 60 days ago to demonstrate the "Needs recheck" tag (Cortado, Hojicha Latte). This is computed from today's date, so more items will go stale over time.
