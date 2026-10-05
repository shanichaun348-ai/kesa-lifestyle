/**
 * Kesa Journal — editorial article content.
 *
 * Images resolve to SVG placeholders until real editorial photography exists.
 * Product slugs reference the demo catalogue; unmatched slugs are silently
 * skipped by the repository layer.
 */
import type { Article, Author } from "./types";
import type { ImageRef } from "@/modules/catalog/types";

const editorial: Author = {
  name: "Kesa Editorial",
  bio: "The Kesa team writes about jewellery styling, care and buying — with a focus on practical guidance for everyday Indian wardrobes.",
};

const ph = (n: 1 | 2, alt: string): ImageRef => ({
  src: `/placeholders/editorial-${n}.svg`,
  alt,
  unoptimized: true,
});

export const journalArticles: Article[] = [
  // ─── Styling Guides ────────────────────────────────────────────────────────

  {
    slug: "how-to-style-jewellery-with-a-saree",
    title: "How to style jewellery with a saree",
    excerpt:
      "The blouse neckline decides everything. A practical guide to choosing earrings, necklaces and bangles that work with every saree fabric and drape.",
    type: "Styling Guides",
    tags: ["saree", "styling", "ethnic wear", "earrings", "necklaces", "bangles"],
    author: editorial,
    publishedAt: "2026-09-15",
    readingMinutes: 6,
    image: ph(1, "Jewellery styling guide for saree — editorial flatlay"),
    body: [
      {
        paragraphs: [
          "Before choosing any jewellery for a saree look, identify the neckline of the blouse. The neckline is the anchor point — it tells you where the jewellery should sit, how much space it has, and whether a necklace will even be visible.",
        ],
      },
      {
        heading: "The neckline decides the necklace",
        paragraphs: [
          "A round neck blouse: wear pieces at the base of the neck — a choker, a collar necklace, or earrings that clear the neckline and become the focus. A short necklace that falls inside the neckline disappears.",
          "A deep V blouse: a pendant chain that follows the V elongates further. Don't fill the V with a broad necklace — it fights the neckline's line. Let the pendant fall to the deepest point.",
          "A boat or bateau neck: a collar necklace that spans the width looks considered. It mirrors the neckline's horizontal energy.",
          "A square or high square neck: skip the necklace entirely and let the earrings carry the look. A heavy necklace at a square neck creates clutter at the same visual level.",
        ],
      },
      {
        heading: "Heavy weaves and sheer fabrics",
        paragraphs: [
          "Kanjivaram and Banarasi silks already carry significant visual weight. One statement piece — usually earrings. If you wear a necklace, a single-strand choker rather than a layered look. The weave is doing enough.",
          "Chiffon and georgette are light fabrics that allow jewellery to become the focal point. A statement necklace with matching earrings works here. The fabric won't compete.",
          "Cotton, linen and handloom sarees are informal enough for maximalism. Stacked bangles, jhumkas, a statement necklace — all appropriate. These fabrics have a texture and casualness that carries the weight.",
          "Net and sheer sarees are heavily embellished at the border and pallu. Choose lightweight pieces that don't layer visual detail on top of existing detail.",
        ],
      },
      {
        heading: "The dupatta complication",
        paragraphs: [
          "A dupatta pinned across one shoulder and over the arm means your necklace will be partially hidden during the ceremony. Choose pieces that sit above the dupatta's edge, or skip the necklace and let earrings do the work.",
          "A dupatta draped over both shoulders covers most of the neckline. Earrings are the better investment here.",
          "No dupatta, or dupatta worn over the head: the most freedom for necklace choices.",
        ],
      },
      {
        heading: "Earrings by saree type",
        paragraphs: [
          "Heavy silk and bridal sarees: chandbalis or jhumkas. The earring needs weight to match the saree's presence.",
          "Chiffon and contemporary sarees: structured drops or pearl drops. Elegant without competing with the drape.",
          "Cotton and casual handlooms: small huggies, simple studs, or lightweight jhumkas. The saree is informal and the earring should match the register.",
        ],
      },
      {
        heading: "Bangles and wrist pieces",
        paragraphs: [
          "Bangles belong to formal and festive saree occasions. For casual sarees — a simple bracelet or nothing.",
          "Four bangles per wrist reads formal; two reads contemporary. Keep the metal tone matching your earrings and necklace.",
          "If wearing a full bangles stack, skip rings or keep them minimal. The wrist piece is already carrying significant visual weight.",
        ],
      },
    ],
    relatedProductSlugs: [
      "statement-chandbali-earrings",
      "oxidised-jhumka-earrings",
      "kundan-choker-necklace",
      "slim-stackable-bangles-set-of-4",
      "pearl-drop-earrings-gold-tone",
    ],
    relatedCategoryPaths: ["women/earrings", "women/necklaces", "women/bangles"],
    relatedArticleSlugs: ["best-jewellery-for-wedding-guests", "how-to-layer-necklaces"],
  },

  {
    slug: "how-to-layer-necklaces",
    title: "How to layer necklaces",
    excerpt:
      "Length, weight and finish — three decisions that make layered necklaces look intentional instead of accidental.",
    type: "Styling Guides",
    tags: ["necklaces", "layering", "chains", "styling", "stacking"],
    author: editorial,
    publishedAt: "2026-09-02",
    readingMinutes: 5,
    image: ph(2, "Layered necklace styling — chains at different lengths"),
    body: [
      {
        paragraphs: [
          "Layered necklaces have remained mainstream because they are more adaptable than single statement pieces. The same two chains can look minimal on a Monday and dressed-up on a Friday. Getting the combination right comes down to three decisions: length, weight and finish.",
        ],
      },
      {
        heading: "The length rule",
        paragraphs: [
          "Layered chains need space between them to stay readable. The minimum gap is about 2 inches (5 cm) between each chain.",
          "The standard three-chain stack: 16 inch sits at the base of the throat, 18 inch falls to the collarbone, 20–22 inch rests at sternum level. Each level is visually distinct.",
          "The most wearable everyday version is just two chains: 16 inch plus 20 inch. Clearly separated, worn over an open collar shirt or scoop neck. This combination is harder to get wrong.",
        ],
      },
      {
        heading: "Chain weight and proportion",
        paragraphs: [
          "The chain nearest the throat should be the lightest. A slim delicate chain at the top looks intentional; a chunky chain at the top makes everything below it invisible.",
          "Increase weight as you go down, not across. Two chains of the same width look like a styling error rather than a deliberate choice.",
          "A 2 mm box or curb chain at the top, a 3–4 mm rope or figaro at the second level, and a pendant chain at the third works consistently.",
        ],
      },
      {
        heading: "Pendants in a layered look",
        paragraphs: [
          "One pendant in a layered stack — that is the limit. Two pendants compete with each other and break the clean vertical line.",
          "Place the pendant on the middle or bottom chain, not the top. A pendant at the throat interrupts the layered effect.",
          "Keep the pendant simple: a small disc, a bar, a geometric shape. A large ornate pendant overpowers the layered chains around it.",
        ],
      },
      {
        heading: "Metal consistency",
        paragraphs: [
          "Keep all layers in the same metal tone. Gold-tone chains with gold-tone pendants; silver-tone throughout.",
          "The exception: a chain with a mixed-metal pendant works when the accent is subtle — a gold chain with a pendant that has a small silver detail reads intentional. Entirely different tones across layers do not.",
        ],
      },
      {
        heading: "The right neckline",
        paragraphs: [
          "V-neck: ideal. The V creates a natural frame for layered chains and shows all levels clearly.",
          "Open collar or button-down: the opening works like a V. Layered chains read well here.",
          "High necklines — crew, turtleneck, polo: layered necklaces pile up at the collarbone and become muddy. Wear one long chain as a pendant outside the neckline instead.",
          "Light fabrics show layering better than heavy textures. A fine cotton or silk shirt shows multiple chain levels; a heavy knit compresses them together.",
        ],
      },
      {
        heading: "Keeping them from tangling",
        paragraphs: [
          "Fine chains at similar lengths tangle constantly. Box chains tangle less than rope or curb. The most tangle-resistant combination: one flat chain and one heavier curb, at clearly different lengths.",
          "A pendant on one chain physically keeps the two chains apart — it adds separation as a side effect of the styling choice.",
        ],
      },
    ],
    relatedProductSlugs: [
      "fine-pendant-chain-gold-tone",
      "layered-coin-necklace",
      "fine-curb-chain-bracelet",
      "fine-box-chain-stainless-steel",
    ],
    relatedCategoryPaths: ["women/necklaces", "men/chains"],
    relatedArticleSlugs: ["gold-vs-silver-jewellery", "jewellery-for-office-wear"],
  },

  // ─── Jewellery Guides ──────────────────────────────────────────────────────

  {
    slug: "how-to-choose-earrings-for-your-face-shape",
    title: "How to choose earrings for your face shape",
    excerpt:
      "Face shape theory is a useful starting point, not a constraint. Here is what works for each shape — and why the mirror matters more than the rule.",
    type: "Jewellery Guides",
    tags: ["earrings", "face shape", "buying guide", "oval", "round", "square", "heart"],
    author: editorial,
    publishedAt: "2026-09-28",
    readingMinutes: 5,
    image: ph(1, "Guide to choosing earrings by face shape"),
    body: [
      {
        paragraphs: [
          "Face shape guides work on a single principle: earrings that contrast your face's strongest feature create balance. Elongating shapes balance round faces; softening curves balance angular ones. That is the entire theory — the rest is application.",
        ],
      },
      {
        heading: "Identifying your face shape",
        paragraphs: [
          "Pull your hair back completely. Look at the overall shape — the width at forehead vs cheekbones vs jaw, and the proportion of length to width.",
          "The rough categories: oval (slightly longer than wide, narrow jaw), round (similar width and length, soft jaw), square (strong jaw, similar width throughout), heart (wide forehead, narrow chin), long or oblong (narrow and clearly elongated).",
          "Most faces do not fit neatly into one category. Identify the dominant characteristic — jaw strength, face length, or width — and that is usually enough to apply the guidance below.",
        ],
      },
      {
        heading: "Oval face",
        paragraphs: [
          "The most adaptable shape: most earring styles work. The challenge is that there is no obvious 'avoid this' guidance, which makes the oval category less useful than the others.",
          "Earrings that add interest without overpowering proportions work well: geometric shapes, rectangular drops, structured chandeliers, modern linear pendants.",
        ],
      },
      {
        heading: "Round face",
        paragraphs: [
          "The goal is elongation. Earrings that drop straight down create a vertical line that makes the face appear longer.",
          "Work well: linear drops, long angular pendants, slim jhumkas, stud-to-drop chains.",
          "Avoid: large circular hoops (they echo the round face shape and emphasise width), round button studs worn alone.",
          "Practical note: small round studs are subtle enough not to affect face shape perception. The 'avoid round hoops' guidance applies to large statement hoops, not everyday small ones.",
        ],
      },
      {
        heading: "Square and angular face",
        paragraphs: [
          "The goal is softening. Round and curved shapes balance angular features.",
          "Work well: circular hoops, oval drops, soft pendant shapes, huggie hoops with a curved silhouette.",
          "Avoid: geometric drops and sharp rectangular shapes — they emphasise the sharpness already present.",
          "One honest caveat: many people with square face shapes find angular earrings look powerful and intentional rather than wrong. These are guides, not prescriptions.",
        ],
      },
      {
        heading: "Heart face (wide forehead, narrow chin)",
        paragraphs: [
          "The goal is to add visual width at the jaw level. Earrings that are wider at the bottom balance the narrower chin.",
          "Work well: chandbalis (wider at the base than the top), triangular drops, tiered earrings that widen as they descend.",
          "Avoid: narrow linear drops (they make the jaw look even narrower) and teardrop shapes that taper to a point at the bottom.",
        ],
      },
      {
        heading: "Long and oblong face",
        paragraphs: [
          "The goal is to add horizontal width. Round hoops and wide earrings create the visual illusion of a broader face.",
          "Work well: large hoops, wide studs, horizontal bar earrings, chandbalis that spread at the shoulder line.",
          "Avoid: very long linear drops — they add more vertical length to a face that already has length.",
        ],
      },
      {
        heading: "The rule isn't the point",
        paragraphs: [
          "Face shape theory was developed for style advice, not physics. Your skin tone, hair length, personal aesthetic and the specific outfit all matter more in the final image than geometric guidelines.",
          "The practical test: put them on and look in the mirror. If they feel right, they are right. Face shape theory is a starting point — especially useful when shopping without trying things on.",
        ],
      },
    ],
    relatedProductSlugs: [
      "pearl-drop-earrings-gold-tone",
      "minimal-huggie-hoops-gold-tone",
      "statement-chandbali-earrings",
      "oxidised-jhumka-earrings",
      "pearl-stud-earrings",
    ],
    relatedCategoryPaths: ["women/earrings"],
    relatedArticleSlugs: ["jewellery-gift-ideas-for-her", "how-to-style-jewellery-with-a-saree"],
  },

  // ─── Buying Guides ─────────────────────────────────────────────────────────

  {
    slug: "gold-vs-silver-jewellery",
    title: "Gold vs silver jewellery: which should you choose?",
    excerpt:
      "In fashion jewellery, both are plated finishes. Which one to choose comes down to your wardrobe — and the one rule that actually matters.",
    type: "Buying Guides",
    tags: ["gold tone", "silver tone", "buying guide", "skin tone", "metal finish"],
    author: editorial,
    publishedAt: "2026-08-20",
    readingMinutes: 4,
    image: ph(2, "Gold tone vs silver tone jewellery comparison flatlay"),
    body: [
      {
        paragraphs: [
          "In fashion jewellery, 'gold' means a gold-toned plated finish and 'silver' means a silver-toned plated finish. Neither contains precious metal. The choice is aesthetic, and while there is conventional guidance on it, the conventional guidance is less useful than your wardrobe.",
        ],
      },
      {
        heading: "The skin undertone theory",
        paragraphs: [
          "The traditional rule: warm undertones (golden, peachy, olive skin) pair well with gold-tone metal; cool undertones (pink, bluish, neutral) pair better with silver.",
          "How to check your undertone: look at the veins on the inside of your wrist. Blue or purple veins indicate cool undertones; greenish veins indicate warm.",
          "The honest caveat: this rule is widely taught and widely broken. Many people with warm undertones default to silver; many with cool undertones wear gold every day and it reads perfectly. Personal preference reliably overrides colour theory.",
        ],
      },
      {
        heading: "Follow your wardrobe instead",
        paragraphs: [
          "A wardrobe of earthy tones — rust, mustard, olive, warm white, camel — integrates naturally with gold-toned jewellery. The warm palette and warm metal share a visual temperature.",
          "A wardrobe of cool blues, greys, blacks, navy and bright white: silver-tone complements without competing. Gold against a cool grey outfit draws attention to the contrast rather than completing the look.",
          "The most useful question is not 'which suits my skin' but 'which works with the clothes I actually wear most'.",
        ],
      },
      {
        heading: "When mixing metals works",
        paragraphs: [
          "Mixed-metal styling — gold-tone chain, silver rings — is valid and has been mainstream for years. The rule is that one tone should dominate. A majority of gold-tone pieces with one silver accent reads as intentional. A 50/50 split reads as unplanned.",
          "Mixing works best when the two pieces do not sit at the same visual level at the same time. A gold chain necklace and silver rings are separated by enough visual distance to coexist. Two adjacent bracelets in different tones work less well.",
        ],
      },
      {
        heading: "Ethnic vs Western wear",
        paragraphs: [
          "Traditional Indian occasions tend strongly towards gold tone. Weddings, puja, festive functions — the cultural association with gold is deep enough that silver-tone jewellery at a traditional ceremony can feel incongruous.",
          "Contemporary and Western outfits have no such convention. Silver-tone has an easier time in office wear and casual dressing across most Indian cities.",
          "For pieces you plan to wear constantly — the daily chain, the everyday earrings — gold-tone tends to be more versatile across an Indian wardrobe that mixes traditional and Western dressing.",
        ],
      },
      {
        heading: "Durability: no real difference",
        paragraphs: [
          "For plated fashion jewellery, neither gold nor silver tone is inherently more durable. Both depend on the base metal quality and the plating thickness. The care requirements are identical.",
          "The visual difference in tarnish: gold-toned tarnish appears as darkening; silver-toned tarnish appears as yellowing or cloudiness. Polished with a soft cloth, both recover the same way.",
        ],
      },
      {
        heading: "The only rule that works",
        paragraphs: [
          "Buy more of what you actually reach for. If you have ten gold-tone pieces and two silver-tone pieces, your answer is already in your drawer.",
        ],
      },
    ],
    relatedProductSlugs: [
      "fine-pendant-chain-gold-tone",
      "fine-box-chain-stainless-steel",
      "pearl-drop-earrings-gold-tone",
      "minimal-huggie-hoops-gold-tone",
    ],
    relatedCategoryPaths: ["women/earrings", "women/necklaces", "men/chains"],
    relatedArticleSlugs: ["how-to-layer-necklaces", "jewellery-for-office-wear"],
  },

  // ─── Gift Guides ───────────────────────────────────────────────────────────

  {
    slug: "jewellery-gift-ideas-for-her",
    title: "Jewellery gift ideas for her",
    excerpt:
      "Jewellery is personal — but there is a reliable framework for getting it right, whether you know her style well or you are guessing.",
    type: "Gift Guides",
    tags: ["gifts", "gifting", "birthday", "anniversary", "women", "buying guide"],
    author: editorial,
    publishedAt: "2026-09-10",
    readingMinutes: 5,
    image: ph(1, "Jewellery gift guide — gift wrapping with pieces"),
    body: [
      {
        paragraphs: [
          "Jewellery is among the most personal gifts — and the most commonly defaulted on, because uncertainty leads to the nearest generic option. The better approach is a simple framework: read what she already wears, match the occasion, and invest in presentation.",
        ],
      },
      {
        heading: "Read what she already wears",
        paragraphs: [
          "Daily pieces are the most reliable signal. If she wears pearl studs every day, she values classic and understated — she will appreciate a pearl necklace or a simple chain. If she wears statement earrings daily, she enjoys being noticed — choose something bolder.",
          "Look at her metal tone default. Most people have one and stick to it. A gift in the wrong metal tone gets less wear.",
          "Look at her wardrobe palette. Someone who mostly wears earthy tones and traditional fabrics will love different pieces than someone whose wardrobe is contemporary and minimal.",
        ],
      },
      {
        heading: "Safe universal choices",
        paragraphs: [
          "Pearl studs: arguably the most reliable jewellery gift across ages and style preferences. No other single piece works so consistently from office to wedding.",
          "A delicate chain necklace (16–18 inches): sits under any neckline, works with everything, gold or silver tone depending on her preference. A piece she will pick up without thinking.",
          "Small huggie hoops or 20mm hoops: understated but always current. A step up from pearl studs in the fashion-forward direction.",
          "These are 'safe' not because they are boring, but because they have a genuine chance of being worn repeatedly. The failure mode of jewellery gifts is the beautiful piece that never leaves the box.",
        ],
      },
      {
        heading: "By occasion",
        paragraphs: [
          "Birthday: choose something in her everyday style, perhaps a slightly elevated version of what she already wears. A gift for a birthday should feel considered and personal, not like a category of purchase.",
          "Anniversary or milestone: this is the moment to go slightly beyond her daily default — a better version of what she loves, or a piece she has mentioned. Milestone gifts should feel like an upgrade.",
          "New job or achievement: minimal and significant tends to work better than celebratory maximalism. A simple chain or a pair of small hoops with stones she has mentioned.",
          "Festival season (Diwali, Dussehra): festive jewellery is expected and welcome. Statement earrings, bangles, a set. This is the occasion where going bolder is culturally appropriate.",
        ],
      },
      {
        heading: "Things to avoid",
        paragraphs: [
          "Pieces that require knowing her ring size — unless you can check discreetly. An ill-fitting ring communicates carelessness even when it isn't.",
          "Trends that will date within a year, unless she explicitly follows trends. A classic piece she can wear in five years is more valuable than a trend piece she can wear for one season.",
          "Anything referencing a specific outfit you haven't seen her in. Jewellery gifted with 'this would look perfect with your green saree' is thoughtful only if you are certain.",
        ],
      },
      {
        heading: "Presentation matters",
        paragraphs: [
          "The same piece in a thoughtful package and in a plain carrier bag reads differently. Presentation signals the attention paid.",
          "A short note explaining why you chose this specific piece does more than the box. It converts a gift into a story.",
        ],
      },
    ],
    relatedProductSlugs: [
      "pearl-stud-earrings",
      "pearl-drop-earrings-gold-tone",
      "fine-pendant-chain-gold-tone",
      "minimal-huggie-hoops-gold-tone",
      "kundan-necklace-earring-set",
    ],
    relatedCategoryPaths: ["women/earrings", "women/necklaces", "women/bracelets"],
    relatedArticleSlugs: [
      "how-to-choose-earrings-for-your-face-shape",
      "how-to-care-for-artificial-jewellery",
    ],
  },

  // ─── Jewellery Care ────────────────────────────────────────────────────────

  {
    slug: "how-to-care-for-artificial-jewellery",
    title: "How to care for artificial jewellery",
    excerpt:
      "Moisture, chemicals and abrasion are the three enemies. Simple habits at three points — before, during and after wearing — keep plated pieces bright for years.",
    type: "Jewellery Care",
    tags: ["care", "maintenance", "tarnish", "gold plated", "cleaning", "storage"],
    author: editorial,
    publishedAt: "2026-08-05",
    readingMinutes: 5,
    image: ph(2, "Jewellery care and cleaning — pieces laid on a soft cloth"),
    body: [
      {
        paragraphs: [
          "Artificial jewellery — brass, alloy or steel base with a plated finish — can last years with basic habits, or look dull within weeks without them. The three enemies are moisture, chemicals and abrasion. Most care advice maps to avoiding one of these three.",
        ],
      },
      {
        heading: "Before putting it on",
        paragraphs: [
          "Apply perfume, hairspray, sunscreen and skin creams at least a few minutes before putting on jewellery. Let them dry completely.",
          "The active chemicals in fragrance — particularly alcohol — and in many skincare products react with the plated surface and accelerate tarnish. This rule applies most critically to earrings (close to the fragrance spray zone), rings and bracelets (near skincare application), and necklaces (skin contact).",
          "There is no need to change your skincare or fragrance routine. The only habit is: jewellery goes on last.",
        ],
      },
      {
        heading: "During wear",
        paragraphs: [
          "Take jewellery off before swimming. Both pool and sea water are damaging — chlorine strips plating; salt accelerates tarnish.",
          "Take it off before showering. Water alone is not the problem; the combination with soap, shampoo and mineral content in tap water is.",
          "Take rings off before washing dishes or cooking. Detergent and cooking oils both dull finishes over repeated exposure.",
          "Sweat is mildly acidic. If you wear pieces to exercise, either remove them first or clean them immediately after.",
        ],
      },
      {
        heading: "After wearing",
        paragraphs: [
          "Wipe each piece with a clean, dry, soft cloth before storing. This removes skin oil, sweat and any residue that would accelerate tarnish overnight.",
          "For earrings: clean the posts and backs, where skin contact is constant and where oil accumulates.",
          "Don't leave jewellery on a bathroom shelf overnight. Bathroom humidity is the main driver of tarnish in stored jewellery.",
        ],
      },
      {
        heading: "Cleaning tarnished pieces",
        paragraphs: [
          "For light tarnish: a soft damp cloth is usually enough. Wipe gently and dry completely.",
          "For heavier tarnish: a soft cloth with a very small amount of mild soap, worked gently, rinsed immediately and dried completely. This is the maximum.",
          "Never use: toothbrushes, metal polishing cloths, abrasive creams or ultrasonic cleaners. These physically remove the plating layer along with the tarnish.",
          "Never soak: submerging plated jewellery in any liquid — even water — loosens stone settings and weakens adhesive on enamel or resin elements.",
        ],
      },
      {
        heading: "Storage",
        paragraphs: [
          "Each piece in its own soft pouch or compartment. Metal-on-metal contact causes micro-scratches that dull the surface over time.",
          "Keep jewellery in a dry location — a bedroom drawer rather than a bathroom shelf.",
          "For pieces worn infrequently, airtight zip pouches slow tarnish significantly. A small silica gel sachet placed in the jewellery box absorbs ambient moisture.",
        ],
      },
      {
        heading: "When a piece has run its course",
        paragraphs: [
          "If the plating has worn through at friction points — the knuckle-side of rings, the clasp area of necklaces — the piece is at the end of its plated life. Some jewellers offer re-plating for a small fee, which is worth doing for pieces with sentimental value.",
          "For everyday fashion pieces, the budget supports wearing them fully and replacing them. Knowing that, the practical approach is simply to enjoy them without over-managing.",
        ],
      },
    ],
    relatedProductSlugs: [
      "pearl-drop-earrings-gold-tone",
      "minimal-huggie-hoops-gold-tone",
      "fine-pendant-chain-gold-tone",
    ],
    relatedCategoryPaths: ["women/earrings", "women/necklaces"],
    relatedArticleSlugs: ["gold-vs-silver-jewellery"],
  },

  // ─── Occasion Guides ───────────────────────────────────────────────────────

  {
    slug: "best-jewellery-for-wedding-guests",
    title: "Best jewellery for wedding guests",
    excerpt:
      "One rule above all: the occasion is not about you. How to look genuinely dressed without pulling focus from the wedding party.",
    type: "Occasion Guides",
    tags: ["wedding", "guest", "occasion", "ethnic", "styling"],
    author: editorial,
    publishedAt: "2026-10-01",
    readingMinutes: 5,
    image: ph(1, "Wedding guest jewellery styling guide"),
    body: [
      {
        paragraphs: [
          "Wedding guest dressing has one principle above all others: the occasion is not about you. Jewellery that is visible and beautiful without pulling focus from the wedding party is the right call. This guide is about reading the wedding correctly and dressing accordingly.",
        ],
      },
      {
        heading: "Read the occasion before choosing anything",
        paragraphs: [
          "The ceremony type tells you the register. A temple, church or registry ceremony is formal. A sangeet or mehndi is elevated casual. A reception at a hotel is usually close to black-tie.",
          "An evening reception implies evening jewellery is appropriate. A daytime garden wedding implies smart casual.",
          "When in doubt, look at the venue and start time rather than guessing from the invitation.",
        ],
      },
      {
        heading: "Day vs evening",
        paragraphs: [
          "A wedding before 5 PM: refined and understated. Choose pieces that look polished without looking like they belong in a photoshoot. Not so minimal that you appear uninterested, not so maximalist that you are overdressed for the hour.",
          "A wedding after 5 PM: evening jewellery is entirely appropriate. Chandbalis, statement earrings, a full bangles stack, a layered necklace — these belong here.",
        ],
      },
      {
        heading: "What not to wear",
        paragraphs: [
          "Full bridal sets — kundan choker, earrings, maang tikka together — read as bridal. Save these for when you are the bride or part of the wedding party.",
          "Pieces heavier or more elaborate than what the bride is wearing. This is rare in practice but worth noting.",
          "White-and-gold aesthetics designed to mirror traditional bridal styling.",
          "One clarification: 'not competing with the bride' is about the look's intent, not about erasing yourself. A guest who appears visibly underdressed is also a problem — the goal is to look dressed, gracefully.",
        ],
      },
      {
        heading: "By outfit type",
        paragraphs: [
          "Silk saree for a ceremony: chandbalis or jhumkas, a single-strand necklace. Maximum two statement pieces.",
          "Salwar or anarkali for a semi-formal function: one statement earring plus simple bangles or a bracelet set. Keep the necklace light or skip it.",
          "Lehenga for sangeet or reception: full permission for a layered look — earrings, necklace, bangles. The embroidery of the lehenga determines how much further you can go.",
          "Indo-western or fusion outfit: one strong piece (usually statement earrings) and minimal everything else. The outfit is already doing hybrid work.",
        ],
      },
      {
        heading: "The reliable combination",
        paragraphs: [
          "When you are uncertain: pearl or stone drop earrings, a simple necklace and a set of slim bangles. This combination works for nearly every Indian wedding guest scenario, at nearly any time of day.",
          "It reads as dressed and considered without any of the complications above.",
        ],
      },
    ],
    relatedProductSlugs: [
      "pearl-drop-earrings-gold-tone",
      "statement-chandbali-earrings",
      "kundan-necklace-earring-set",
      "slim-stackable-bangles-set-of-4",
      "oxidised-jhumka-earrings",
    ],
    relatedCategoryPaths: [
      "women/earrings",
      "women/necklaces",
      "women/jewellery-sets",
      "women/bangles",
    ],
    relatedArticleSlugs: ["how-to-style-jewellery-with-a-saree", "how-to-care-for-artificial-jewellery"],
  },

  {
    slug: "jewellery-for-office-wear",
    title: "Jewellery for office wear",
    excerpt:
      "Two constraints: your office's formality level, and not distracting in a meeting. Everything within those constraints is available.",
    type: "Occasion Guides",
    tags: ["office", "workwear", "professional", "styling", "everyday"],
    author: editorial,
    publishedAt: "2026-09-22",
    readingMinutes: 4,
    image: ph(2, "Minimal jewellery for professional and office styling"),
    body: [
      {
        paragraphs: [
          "Office jewellery is shaped by two constraints: the formality level of your specific workplace, and the basic requirement that jewellery should not distract during a meeting. Everything within those two constraints is open.",
        ],
      },
      {
        heading: "Know your office's register",
        paragraphs: [
          "Financial, legal and consulting environments tend to have conservative dress norms. Small earrings, a simple necklace, a clean bracelet — these are the upper limit.",
          "Creative agencies, design studios, media companies and startups have no such convention. A statement earring is as professionally appropriate as a plain stud.",
          "When uncertain, observe what senior colleagues at your level wear. That tells you more about actual culture than any written dress code.",
        ],
      },
      {
        heading: "Universally appropriate pieces",
        paragraphs: [
          "Small studs — pearl, metal or stone — are appropriate in every office at every level for any meeting. They are the floor of professional jewellery.",
          "Huggie hoops or small hoops under 25 mm: slightly more visible than studs, still professional.",
          "A delicate chain necklace: invisible under high necklines, subtle under open ones. Never out of place.",
          "A simple bracelet or watch: entirely standard.",
          "These are the pieces that allow you to be dressed and considered without drawing comment.",
        ],
      },
      {
        heading: "When bolder pieces work",
        paragraphs: [
          "Creative environments: statement earrings are not only appropriate — they often signal a design sensibility that is part of the job.",
          "Client-facing roles where personal presentation is professionally relevant: a jewellery buyer, a brand manager, a consultant in a creative field.",
          "Later in the workday: the morning meeting has more scrutiny than the afternoon. A statement earring that feels bold at 9 AM reads more comfortably by 3 PM.",
        ],
      },
      {
        heading: "Pieces that do not work anywhere",
        paragraphs: [
          "Jewellery that makes sound: anklets with bells, charm bracelets that jingle with every keystroke. In an open-plan office, audible jewellery is a genuine distraction to others.",
          "Very long earrings that catch on headsets or clothing — a practical and safety concern.",
          "Wide bangles that hit the desk with every keystroke. The sound carries farther than you expect.",
        ],
      },
      {
        heading: "The one-statement-piece rule",
        paragraphs: [
          "If wearing a statement earring, keep everything else minimal: a simple ring or bracelet, no necklace.",
          "If wearing a statement necklace, go with studs or small hoops.",
          "One piece communicates. Everything else supports it. Two statement pieces compete.",
        ],
      },
      {
        heading: "From office to evening",
        paragraphs: [
          "The simplest version: wear minimal pieces to the office, swap in statement earrings for the evening.",
          "The smarter version: choose pieces that work at both levels. Pearl drops or medium hoops at a collar level take you from a board meeting to dinner without any change.",
        ],
      },
    ],
    relatedProductSlugs: [
      "pearl-stud-earrings",
      "minimal-huggie-hoops-gold-tone",
      "fine-pendant-chain-gold-tone",
      "pearl-drop-earrings-gold-tone",
    ],
    relatedCategoryPaths: ["women/earrings", "women/necklaces"],
    relatedArticleSlugs: ["how-to-layer-necklaces", "gold-vs-silver-jewellery"],
  },
];
