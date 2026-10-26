# PRD — شنو أطلب؟ / Shno Atleb (v1 Landing Page)

**Status:** Draft v0.1 · **Target launch:** 3–4 weeks · **Owner:** Chartedlife

## 1. Goal

Validate demand for curated "exact order" discovery in Kuwait with a single landing page, 20–30 verified items, and a waitlist for the later reviews/app phase.

## 2. Positioning

Curated best-seller discovery. **Not** a review platform, café directory, or delivery app.

## 3. MVP scope

| In scope (v1) | Out of scope (v1) |
|---|---|
| Landing page only (no app) | User accounts |
| 20–30 curated items | User reviews |
| 5 categories: Iced coffee, Hot coffee, Specialty latte, Matcha & other, Cake & dessert | User-uploaded photos |
| Filters: area, café, drink type, price range | Full app |
| Item card (see §6) | Online ordering |
| "Submit your favorite best seller" form | Ratings / stars |
| Email/WhatsApp waitlist (reviews + app) | Loyalty / gamification |
| Search by item name and café | |
| AR/EN toggle with RTL support | |

## 4. User stories

| # | As a… | I want to… | So that… |
|---|---|---|---|
| 1 | Coffee drinker | see the exact order name for a café's best seller | I can say it at the counter without guessing |
| 2 | Coffee drinker | filter by area and category | I find something near me that fits my mood |
| 3 | Coffee drinker | filter by price range | I stay within budget |
| 4 | Visitor from Instagram/TikTok | land on a fast mobile page in Arabic | I get the answer in seconds |
| 5 | Bilingual user | toggle AR/EN | I read in my preferred language |
| 6 | Coffee fan | submit my own favorite best seller | the list reflects real local taste |
| 7 | Reader | see source and "last verified" date | I can judge how current the info is |
| 8 | Café staff / owner | flag a correction | wrong info gets fixed |
| 9 | Interested user | join the waitlist | I'm told when reviews and photos launch |

## 5. Page structure (build order)

| # | Section | Notes |
|---|---|---|
| 1 | Hero | Headline شنو أطلب؟, subhead, search bar, AR/EN toggle |
| 2 | Top 10 this week | Horizontal scroll or grid |
| 3 | Category chips | Iced / Hot / Specialty / Matcha / Cake |
| 4 | Filter bar | Area, café, price range, drink type |
| 5 | Main grid | 1 col mobile, 2–3 col desktop |
| 6 | Browse by area | Salmiya, Kuwait City, Jabriya, Hawally, Salwa, Fintas, Ahmadi, Farwaniya |
| 7 | Submit a best seller | CTA block + form |
| 8 | Waitlist | "Be first to add reviews & photos" |
| 9 | Footer | Community-sourced disclaimer, correction link, socials |

## 6. Card anatomy (all required)

Photo (gradient placeholder → real photo) · exact order name (large) · café + area · price in KWD (3 decimals, e.g. 1.750 KD) · badge · one-line reason · "Last verified" date · map link · correction link.

## 7. Content schema

| Field | Type | Notes |
|---|---|---|
| `id` | string | slug |
| `item_name_ar` | string | exact order name in Arabic |
| `item_name_en` | string | exact order name in English |
| `cafe_name` | string | brand name |
| `area` | enum | Salmiya, Kuwait City, Jabriya, Hawally, Salwa, Fintas, Ahmadi, Farwaniya |
| `category` | enum | iced_coffee, hot_coffee, specialty_latte, matcha_other, cake_dessert |
| `price_kwd` | decimal | 3 decimals |
| `badge` | enum | most_ordered, staff_pick, cult_favorite, local_favorite |
| `reason_ar` | string | one line |
| `reason_en` | string | one line |
| `image_url` | string | |
| `map_url` | string | Google Maps link |
| `source` | string | "staff interview" / "delivery app ranking" / "community submission" |
| `date_verified` | date | **required**, drives freshness |
| `status` | enum | active, needs_recheck, archived |

**Data rules**
- Every item must have `date_verified`.
- Older than 60 days → flag `needs_recheck`.
- Never publish without a `source`.

### JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id","item_name_ar","item_name_en","cafe_name","area","category","price_kwd","badge","reason_ar","reason_en","map_url","source","date_verified","status"],
  "properties": {
    "id": {"type": "string", "pattern": "^[a-z0-9-]+$"},
    "item_name_ar": {"type": "string"},
    "item_name_en": {"type": "string"},
    "cafe_name": {"type": "string"},
    "area": {"enum": ["Salmiya","Kuwait City","Jabriya","Hawally","Salwa","Fintas","Ahmadi","Farwaniya"]},
    "category": {"enum": ["iced_coffee","hot_coffee","specialty_latte","matcha_other","cake_dessert"]},
    "price_kwd": {"type": "number", "multipleOf": 0.001, "minimum": 0},
    "badge": {"enum": ["most_ordered","staff_pick","cult_favorite","local_favorite"]},
    "reason_ar": {"type": "string"},
    "reason_en": {"type": "string"},
    "image_url": {"type": "string"},
    "map_url": {"type": "string", "format": "uri"},
    "source": {"enum": ["staff interview","delivery app ranking","community submission"]},
    "date_verified": {"type": "string", "format": "date"},
    "status": {"enum": ["active","needs_recheck","archived"]}
  }
}
```

## 8. Brand & language rules

- Never claim "official best seller." Use: Most-ordered pick, Local favorite, Staff recommendation, Cult favorite.
- Never imply partnership or endorsement.
- Arabic first, English second; RTL-aware layout.

## 9. Design direction

| Element | Direction |
|---|---|
| Palette | Cream/sand background, espresso brown text, one accent (terracotta chosen for prototype) |
| Type | IBM Plex Sans Arabic / Noto Kufi Arabic (AR), Inter (EN) |
| Feel | Warm, Kuwaiti, modern; generous whitespace; rounded cards; large food photography |
| Platform | Mobile-first (assume ~80% of traffic from Instagram/TikTok) |

## 10. Data collection playbook

1. Visit cafés; ask staff "What are your top 3 best-selling drinks?"
2. Cross-check menus, delivery-app popularity, TikTok/Instagram mentions.
3. Ask 20–30 coffee lovers for their exact orders.
4. Store in Airtable or Notion using the schema above.
5. Record source and date for every entry.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Data goes stale | `date_verified` on every item; 60-day recheck flag; weekly refresh |
| Trademark / brand confusion | No implied partnership; visible disclaimer; "local favorite" language |
| Low moat / easy to copy | Move fast on brand, community submissions, local trust |
| Moderation burden (Phase 2) | Photo-first reviews tied to café + item; manual approval |
| "Best seller" claim disputes | Community-sourced phrasing, cite source, correction link |

## 12. Monetization (documented, not built)

Labeled featured café placements · delivery-app affiliate links · sponsored "new best seller" drops · premium guides (e.g. "Top 20 Iced Coffees in Kuwait") · B2B café insights (search by area).

## 13. Roadmap

| Phase | Scope |
|---|---|
| 1 (v1) | Landing page + waitlist + submissions |
| 2 | Moderated, photo-first reviews tied to café + item |
| 3 | Personalized recommendations, "near me", Arabic-first app |
| 4 | Café dashboards / B2B insights |

## 14. Naming

**Primary:** شنو أطلب؟ — Shno Atleb? ("What do I order?") · **Domain ideas:** shnoatleb.com, shnuatleb.com · **Handles:** @shnoatleb / @shnoatleb.kw

**Alternatives (documented, not used):**

| Arabic | Transliteration | Meaning |
|---|---|---|
| اطلب صح | Otleb Sah | Order right |
| الأكثر طلباً | Al-Akthar Talaban | Most ordered |
| أفضل طلب | Afdal Talab | Best order |
| قهوة الناس | Gahwat Al-Nas | People's coffee |
| دلّة / دلتي | Dalla / Dalti | Kuwaiti coffee pot (heritage) |
| فنجان الكويت | Finjan Al-Kuwait | Kuwait's cup |
| خريطة القهوة | Khareetat Al-Gahwa | Coffee map |
| طلبي | Talabi | My order |

## 15. Success metrics (v1)

Waitlist signups · item submissions · IG/TikTok saves and shares · repeat visits · filter usage (area/category).

## 16. Next 7 days

| # | Action |
|---|---|
| 1 | Finalize name; check IG/TikTok handles, domain, Kuwait trademark |
| 2 | Create Instagram and TikTok accounts |
| 3 | Collect 25 exact orders from 15 cafés |
| 4 | Launch one-page site with waitlist |
| 5 | Post 5 short videos: "The exact iced coffee order in Kuwait" |
| 6 | Measure saves, shares, signups, submissions |
