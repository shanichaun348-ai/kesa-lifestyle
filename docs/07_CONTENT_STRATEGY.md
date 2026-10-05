# 07 — Content Strategy

Brand voice, positioning line evaluation, content model, editorial pillars and production workflow. Technical SEO requirements for content are in `06_SEO_STRATEGY.md`.

---

## 1. Brand voice

**Kesa in one line (internal):** Jewellery that makes everyday dressing feel finished, considered and effortlessly elegant, at a price that lets you build a collection.

| We are | We are not |
|---|---|
| Confident, warm, editorial | Loud, salesy, exclamation-heavy |
| Specific about materials, finish and wear | Vague ("premium quality", "best in class") |
| Indian, contemporary, globally fluent | Either "ethnic store" cliché or imported-brand pastiche |
| Honest about what plated jewellery is and how to care for it | Pretending to be fine jewellery |
| Inclusive of women and men, occasions and budgets | Gendered stereotypes, "for your wife" copy |

**Vocabulary**
- Use: *fashion jewellery, demi-fine look, gold-toned, gold-plated, rhodium-plated, oxidised, anti-tarnish, skin-friendly, lightweight, statement, everyday, layering, finish, polish, pairs with, completes.*
- Avoid: *imitation, artificial, fake, duplicate, cheap, replica, 1 gram gold* (misleading), *100% guaranteed*, ALL CAPS, emojis in product copy.
- Spelling: Indian English (*jewellery, colour, favourite*). Prices as `₹1,299`, never `Rs.` or `INR` in UI.

**Tone by surface**
- Product copy: sensory and practical, second person ("you"), 80–200 words.
- Category/collection copy: helpful guide voice, sub-headed.
- Journal: magazine voice, first-person plural ("we") sparingly.
- Transactional emails: short, reassuring, concrete (dates, numbers).
- Error states: plain, calm, next step offered.

---

## 2. Tagline and positioning line evaluation

The business proposed **"Jewellery That Completes Your Look."** Evaluated against alternatives on six criteria (scored 1–5).

| Candidate | Clarity | Premium feel | Distinctiveness | SEO value (contains "jewellery") | Works short (logo lock-up) | Works for men + women | Total |
|---|---|---|---|---|---|---|---|
| **Jewellery That Completes Your Look** | 5 | 3 | 3 | 5 | 2 | 5 | 23 |
| The Finishing Touch | 4 | 5 | 4 | 1 | 5 | 5 | 24 |
| Finish Every Look | 4 | 4 | 4 | 1 | 5 | 5 | 23 |
| Everyday Elegance, Made Yours | 3 | 4 | 2 | 1 | 3 | 3 | 16 |
| Designed to Be Worn | 3 | 5 | 4 | 1 | 5 | 5 | 23 |
| Wear the Moment | 2 | 4 | 3 | 1 | 5 | 4 | 19 |
| Jewellery for the Life You Dress For | 3 | 4 | 4 | 4 | 2 | 4 | 21 |

**Recommendation:** use a two-tier system.

- **Positioning line (long form):** *"Jewellery That Completes Your Look"* — clear, benefit-led, includes the head term, works in `<title>` suffix, meta descriptions, Organization schema `description`, and the About page.
- **Brand line (short form):** *"The Finishing Touch"* — for the logo lock-up, hero overlays, packaging and social bios where a six-word line is too long. It is the same idea compressed, so the two reinforce rather than compete.

Alternative if one line is strongly preferred: *"Finish Every Look"* works in both roles but loses the SEO keyword. **Decision D2 belongs to the business owner.** Trademark availability should be checked for whichever short line is chosen.

---

## 3. Content model

Content is structured data in Postgres, edited in the admin, rendered by templates. No external CMS (ADR-19).

| Type | Purpose | Key fields | Template |
|---|---|---|---|
| **Homepage sections** | Compose the home page | kind, config (Zod-validated), schedule | Home |
| **Category copy** | Indexable intro/body + FAQ on PLPs | intro_md, body_md, faq_group | PLP |
| **Collection copy** | Editorial header + body | heading, intro_md, body_md, image | PLP |
| **Product copy** | PDP | short_description, description_md, highlights, care, specs via attributes | PDP |
| **Journal post** | Articles | title, excerpt, body_md, cover, category, author, related products/collections | Article |
| **Guide (gift/style)** | Intent landing pages | intro, sections (editorial / product set / collection / image / tip), FAQ | Guide |
| **Page** | About, policies, care guide, contact copy | body_md, versions | Content page |
| **FAQ group** | Reusable Q&A blocks | question, answer_md | Accordion |
| **Navigation / banners** | Site chrome | see IA | — |
| **Email templates** | Transactional copy overrides (P1) | subject, intro | React Email |

**Markdown subset** (rendered with `remark`/`rehype`, sanitised): headings h2–h4, paragraphs, bold/italic, lists, links, images (from media library), blockquote, tables; plus custom directives `::products{ids=…}` and `::collection{slug=…}` for shoppable modules. No raw HTML.

---

## 4. Editorial pillars and cadence

| Pillar | Share | Example topics |
|---|---|---|
| **Styling** | 35% | Jewellery for saree; layering chains for men; minimal earrings for office; festive edits |
| **Care & knowledge** | 20% | How to keep gold-plated jewellery from tarnishing; storing jewellery in humid weather; plating explained honestly |
| **Gifting** | 20% | Anniversary, Raksha Bandhan, Diwali, Valentine's, under-₹999 edits |
| **Trends & edits** | 15% | Seasonal colour edits; wedding-season picks; what's new this month |
| **Brand** | 10% | How we design; quality checks; team; packaging |

Cadence target: 2–4 journal posts per month; 1 new or refreshed guide per month; all category/collection copy complete before launch. Owner: decision D13.

---

## 5. Launch content inventory (must exist before Phase 2 launch)

| Item | Count | Owner |
|---|---|---|
| Category intros + bodies + FAQs | ~11 categories | Content |
| Collection copy | 7 launch collections | Content |
| Product descriptions, highlights, alt text | all launch SKUs | Catalogue + Content |
| About page | 1 | Brand |
| Policies (shipping, returns, privacy, terms) | 4 | Legal/Owner (D7) |
| FAQ (orders, shipping, returns, products, care, account) | ~25 Q&A | Support |
| Jewellery care guide | 1 hub page | Content |
| Journal posts | 4 at launch | Content |
| Email copy (order placed, paid, shipped, delivered, cancelled, refund, login code, review request, welcome) | 9 | Content |
| Microcopy (buttons, empty states, errors, form hints) | spreadsheet | Product + Content |

---

## 6. Photography and imagery direction

- **Product:** consistent studio set (soft neutral background, 3:4 crop for cards, 1:1 for feed), 4–6 angles including on-model/on-hand scale shots, macro detail. Shot list template per category.
- **Editorial:** natural light, real people, Indian contexts without cliché; muted palettes that let metal and stones read.
- **Video:** 5–10s loops of movement/sparkle for hero products; muted, autoplay, lazy.
- File delivery: minimum 2000px long edge, sRGB, JPEG; the pipeline generates AVIF/WebP.
- Decision D12 covers production ownership and timing.

---

## 7. Production workflow

1. Brief (keyword cluster, intent, page type, internal links) created in admin as a draft.
2. Draft written in Markdown with product modules selected.
3. Publishing checklist (guide/article): word count, images with alt, ≥ 2 internal links, FAQ, SEO title/description length, author, cover image. Blocks publish until met.
4. Review by owner; schedule publish.
5. Post-publish: shared on social; added to relevant category "From the Journal"; monitored in GSC after 4 weeks; refresh cycle every 6 months for guides.

---

## 8. Legal and trust content (India)

- Seller legal name, address, GSTIN, grievance officer name/contact, response SLA (Consumer Protection (E-Commerce) Rules 2020) on Contact page and footer link.
- Country of origin on every PDP.
- Return/refund terms in plain language with a worked example.
- Privacy policy covering DPDP Act 2023: purpose, consent, withdrawal, data principal rights, retention, contact.
- Cookie/consent notice limited to analytics and marketing scripts (no banner wall; a compact bottom sheet).
