import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheckIcon, HeartIcon, InfoIcon, SearchXIcon, TriangleAlertIcon } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";
import { EmptyState } from "@/components/storefront/empty-state";
import { PageError } from "@/components/storefront/error-state";
import { LoadingBlock } from "@/components/storefront/loading-block";
import { Price } from "@/components/storefront/price";
import { ProductCard } from "@/components/storefront/product-card";
import { ProductCardSkeleton } from "@/components/storefront/product-card-skeleton";
import { ProductGrid } from "@/components/storefront/product-grid";
import { RatingStars } from "@/components/storefront/rating-stars";
import { SectionHeading } from "@/components/storefront/section-heading";
import { StorePagination } from "@/components/storefront/store-pagination";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { colorTokens, radiusTokens, shadowTokens, spacingScale, typeStyles } from "@/lib/design-tokens";
import { sampleCartLines, sampleProducts } from "@/lib/demo/catalog";

import {
  DialogDemo,
  DrawerDemo,
  LoadingButtonDemo,
  RetryErrorDemo,
  TabsDemo,
  ToastDemo,
} from "./_components/interactive-demos";
import { Example, ShowcaseSection } from "./_components/showcase-section";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

const sections = [
  ["colors", "Colour"],
  ["typography", "Typography"],
  ["hierarchy", "Font hierarchy"],
  ["spacing", "Spacing"],
  ["radius", "Radius"],
  ["shadows", "Shadows"],
  ["buttons", "Buttons"],
  ["inputs", "Inputs"],
  ["cards", "Cards"],
  ["product-cards", "Product cards"],
  ["badges", "Badges"],
  ["navigation", "Navigation"],
  ["header", "Header"],
  ["footer", "Footer"],
  ["modal", "Modal"],
  ["drawer", "Drawer"],
  ["toast", "Toast"],
  ["tabs", "Tabs"],
  ["breadcrumbs", "Breadcrumbs"],
  ["pagination", "Pagination"],
  ["loading", "Loading"],
  ["empty", "Empty states"],
  ["error", "Error states"],
  ["skeleton", "Skeletons"],
] as const;

// Static class strings so Tailwind can see them (dynamic names are not generated).
const shadowClass: Record<(typeof shadowTokens)[number]["name"], string> = {
  header: "shadow-(--shadow-header)",
  float: "shadow-(--shadow-float)",
  overlay: "shadow-(--shadow-overlay)",
};

export default function DesignSystemPage() {
  const first = sampleProducts[0];
  let n = 0;
  const next = () => ++n;

  return (
    <Container>
      <div className="py-12 lg:py-16">
        <p className="type-eyebrow text-ink-subtle">Foundation</p>
        <h1 className="type-h1 mt-2">Kesa design system</h1>
        <p className="type-lead mt-4 max-w-2xl text-ink-muted">
          Every token and reusable component, rendered live. This page is not indexed. The header above and footer
          below are the real components.
        </p>
      </div>

      <nav aria-label="Sections" className="sticky top-14 z-30 -mx-4 border-y border-line bg-bg/95 backdrop-blur lg:top-[4.5rem] lg:mx-0">
        <ul className="no-scrollbar flex gap-1 overflow-x-auto px-4 py-2 lg:flex-wrap lg:px-0">
          {sections.map(([id, label], i) => (
            <li key={id} className="shrink-0">
              <a
                href={`#${id}`}
                className="inline-flex h-9 items-center rounded-sm px-3 text-sm text-ink-muted hover:bg-surface-muted hover:text-ink"
              >
                <span className="mr-1.5 tabular-nums text-ink-subtle">{String(i + 1).padStart(2, "0")}</span>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* 01 Colour */}
      <ShowcaseSection
        id="colors"
        number={next()}
        title="Colour"
        description="A warm neutral palette with one deep accent. Brass appears only on ratings. Remove every brass pixel and the system still reads premium."
      >
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {colorTokens.map((t) => (
            <li key={t.name} className="flex flex-col gap-2">
              <div
                className="aspect-[4/3] rounded-sm border border-line"
                style={{ backgroundColor: t.hex }}
                aria-hidden="true"
              />
              <p className="text-sm font-medium">
                <code className="font-mono text-xs">{t.name}</code>
              </p>
              <p className="type-small text-ink-muted">{t.role}</p>
              <p className="font-mono text-xs text-ink-subtle">{t.hex.toUpperCase()}</p>
            </li>
          ))}
        </ul>
      </ShowcaseSection>

      {/* 02 Typography */}
      <ShowcaseSection
        id="typography"
        number={next()}
        title="Typography"
        description="Fraunces for display and headings, Inter for everything else. Sizes are fluid between 360px and 1280px, so there are no breakpoint jumps."
      >
        <ul className="flex flex-col divide-y divide-line">
          {typeStyles.map((t) => (
            <li key={t.className} className="grid gap-3 py-6 lg:grid-cols-[14rem_1fr] lg:items-baseline">
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="type-small text-ink-muted">{t.use}</p>
                <p className="mt-1 font-mono text-xs text-ink-subtle">
                  .{t.className} · {t.spec}
                </p>
              </div>
              <p className={t.className}>Jewellery that completes your look</p>
            </li>
          ))}
        </ul>
      </ShowcaseSection>

      {/* 03 Hierarchy */}
      <ShowcaseSection
        id="hierarchy"
        number={next()}
        title="Font hierarchy"
        description="A product listing header composed from the scale: eyebrow, H1, lead, body, small."
      >
        <Example label="Category page header">
          <div className="flex flex-col gap-6">
            <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Women", href: "/women/" }, { label: "Earrings" }]} />
            <SectionHeading
              as="h1"
              eyebrow="Women"
              title="Earrings"
              description="Studs, hoops, drops and jhumkas in gold tone, silver tone and oxidised finishes. Lightweight, skin-friendly and made to be worn daily."
              action={{ label: "View all 128", href: "/women/earrings/" }}
            />
            <p className="type-body max-w-prose">
              Body copy sits at 16px with a 1.6 line height for comfortable reading on phones. Links use the brand
              colour:{" "}
              <Link href="/jewellery-care/" className="text-brand underline underline-offset-4">
                how to care for plated jewellery
              </Link>
              .
            </p>
            <p className="type-small text-ink-muted">Small text: showing 24 of 128 · sorted by newest</p>
          </div>
        </Example>
      </ShowcaseSection>

      {/* 04 Spacing */}
      <ShowcaseSection
        id="spacing"
        number={next()}
        title="Spacing"
        description="4px base unit. Sections breathe at 48px on phones and 96px on desktop."
      >
        <ul className="flex flex-col gap-3">
          {spacingScale.map((px) => (
            <li key={px} className="flex items-center gap-4">
              <span className="w-12 shrink-0 font-mono text-xs text-ink-subtle">{px}px</span>
              <span className="h-4 rounded-sm bg-ink" style={{ width: `${px}px` }} aria-hidden="true" />
            </li>
          ))}
        </ul>
      </ShowcaseSection>

      {/* 05 Radius */}
      <ShowcaseSection id="radius" number={next()} title="Border radius" description="Barely rounded. Softness comes from type and whitespace, not corners.">
        <ul className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {radiusTokens.map((r) => (
            <li key={r.name} className="flex flex-col gap-2">
              <div className="aspect-square w-full border border-ink bg-surface" style={{ borderRadius: `${r.px}px` }} aria-hidden="true" />
              <p className="text-sm font-medium">
                <code className="font-mono text-xs">rounded-{r.name}</code> · {r.px}px
              </p>
              <p className="type-small text-ink-muted">{r.use}</p>
            </li>
          ))}
        </ul>
      </ShowcaseSection>

      {/* 06 Shadows */}
      <ShowcaseSection id="shadows" number={next()} title="Shadows" description="Three shadows. Cards and product tiles have none.">
        <ul className="grid gap-6 sm:grid-cols-3">
          {shadowTokens.map((s) => (
            <li key={s.name} className="flex flex-col gap-3">
              <div className={`h-28 rounded-md bg-surface ${shadowClass[s.name]}`} aria-hidden="true" />
              <p className="text-sm font-medium">
                <code className="font-mono text-xs">shadow-{s.name}</code>
              </p>
              <p className="type-small text-ink-muted">{s.use}</p>
            </li>
          ))}
        </ul>
      </ShowcaseSection>

      {/* 07 Buttons */}
      <ShowcaseSection
        id="buttons"
        number={next()}
        title="Buttons"
        description="One primary action per view. 44px default height; 52px for the main purchase action on phones."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <Example label="Variants">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="danger">Remove</Button>
            </div>
          </Example>
          <Example label="Sizes">
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Wishlist">
                <HeartIcon strokeWidth={1.5} />
              </Button>
              <Button size="icon-sm" variant="secondary" aria-label="Wishlist">
                <HeartIcon strokeWidth={1.5} />
              </Button>
            </div>
          </Example>
          <Example label="States">
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled>Disabled</Button>
              <LoadingButtonDemo />
              <Button variant="secondary" disabled>
                Sold out
              </Button>
            </div>
          </Example>
          <Example label="Mobile purchase action">
            <div className="mx-auto max-w-xs">
              <Button size="lg" fullWidth>
                Add to bag · <span className="type-price">₹1,299</span>
              </Button>
            </div>
          </Example>
        </div>
      </ShowcaseSection>

      {/* 08 Inputs */}
      <ShowcaseSection
        id="inputs"
        number={next()}
        title="Inputs"
        description="Visible labels always. 44px tall with 16px text so iOS does not zoom. Errors are linked to their field and announced."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <Example label="Text, email, select, textarea">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="ds-name">Full name</FieldLabel>
                <Input id="ds-name" autoComplete="name" placeholder="Priya Sharma" />
              </Field>
              <Field>
                <FieldLabel htmlFor="ds-email">Email</FieldLabel>
                <Input id="ds-email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" />
                <FieldDescription>Order updates are sent here.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="ds-state">State</FieldLabel>
                <Select>
                  <SelectTrigger id="ds-state" className="w-full">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MH">Maharashtra</SelectItem>
                    <SelectItem value="KA">Karnataka</SelectItem>
                    <SelectItem value="DL">Delhi</SelectItem>
                    <SelectItem value="TN">Tamil Nadu</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="ds-note">Gift message</FieldLabel>
                <Textarea id="ds-note" placeholder="Printed on the card inside the box" maxLength={200} />
                <FieldDescription>Up to 200 characters.</FieldDescription>
              </Field>
            </FieldGroup>
          </Example>
          <Example label="Validation, disabled, choices">
            <FieldGroup>
              <Field data-invalid="true">
                <FieldLabel htmlFor="ds-pincode">Pincode</FieldLabel>
                <Input
                  id="ds-pincode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  defaultValue="4000"
                  aria-invalid="true"
                  aria-describedby="ds-pincode-error"
                />
                <FieldError id="ds-pincode-error">Enter a 6-digit pincode.</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="ds-coupon">Coupon</FieldLabel>
                <Input id="ds-coupon" defaultValue="WELCOME10" disabled />
                <FieldDescription>Applied. Remove it from the bag to change.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Delivery</FieldLabel>
                <RadioGroup defaultValue="standard" aria-label="Delivery method">
                  <Label className="flex min-h-11 items-center gap-3 text-sm">
                    <RadioGroupItem value="standard" />
                    Standard · 3–5 days · Free
                  </Label>
                  <Label className="flex min-h-11 items-center gap-3 text-sm">
                    <RadioGroupItem value="express" />
                    Express · 1–2 days · ₹99
                  </Label>
                </RadioGroup>
              </Field>
              <Label className="flex min-h-11 items-start gap-3 text-sm">
                <Checkbox id="ds-consent" className="mt-0.5" />
                <span className="text-ink-muted">Email me new arrivals and offers. Unsubscribe any time.</span>
              </Label>
            </FieldGroup>
          </Example>
        </div>
      </ShowcaseSection>

      {/* 09 Cards */}
      <ShowcaseSection id="cards" number={next()} title="Cards" description="Hairline border, white surface, no shadow. Padding tokens: none, sm, md.">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Order #KL-100234</CardTitle>
              <CardDescription>Placed 2 Oct 2026 · Delivered</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-ink-muted">
              <p>2 items · ₹3,097</p>
              <p>Shipped by Delhivery, AWB 1234 5678 9012</p>
            </CardContent>
            <CardFooter>
              <Button variant="secondary" size="sm">
                View order
              </Button>
              <Button variant="ghost" size="sm">
                Write a review
              </Button>
            </CardFooter>
          </Card>
          <Card padding="sm">
            <CardHeader>
              <CardTitle>Delivery to 400001</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Alert variant="success">
                <CircleCheckIcon aria-hidden="true" />
                <AlertTitle>Arrives Thursday, 9 Oct</AlertTitle>
                <AlertDescription>Cash on delivery available.</AlertDescription>
              </Alert>
              <Alert variant="info">
                <InfoIcon aria-hidden="true" />
                <AlertTitle>Free shipping unlocked</AlertTitle>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </ShowcaseSection>

      {/* 10 Product cards */}
      <ShowcaseSection
        id="product-cards"
        number={next()}
        title="Product cards"
        description="3:4 imagery, name, price, rating. Hover crossfades to the second image. Wishlist and quick-add are siblings of the product link. Sibling finishes show as swatches."
      >
        <ProductGrid>
          {sampleProducts.map((p, i) => (
            <li key={p.slug}>
              <ProductCard product={p} priority={i < 2} />
            </li>
          ))}
        </ProductGrid>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Example label="Price component">
            <div className="flex flex-col gap-3">
              <Price pricePaise={129900} compareAtPaise={189900} size="lg" />
              <Price pricePaise={89900} />
              <Price pricePaise={149950} size="sm" />
            </div>
          </Example>
          <Example label="Rating and wishlist">
            <div className="flex flex-wrap items-center gap-6">
              <RatingStars rating={4.5} count={128} size="md" />
              <RatingStars rating={3} />
              <WishlistButton productSlug="pearl-drop-earrings-gold-tone" productName="Pearl Drop Earrings" className="border border-line" />
            </div>
          </Example>
        </div>
      </ShowcaseSection>

      {/* 11 Badges */}
      <ShowcaseSection id="badges" number={next()} title="Badges" description="Eyebrow type, hairline or tint. One badge per card at most.">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>New</Badge>
          <Badge variant="muted">Bestseller</Badge>
          <Badge variant="solid">Sold out</Badge>
          <Badge variant="success">In stock</Badge>
          <Badge variant="warning">Only 2 left</Badge>
          <Badge variant="danger">Final sale</Badge>
        </div>
      </ShowcaseSection>

      {/* 12 Navigation */}
      <ShowcaseSection
        id="navigation"
        number={next()}
        title="Navigation"
        description="Desktop: hover or keyboard-focus Women or Men in the header for the mega-menu (CSS only, no JavaScript). Mobile: the menu button opens a full-height sheet with accordions. Below: the in-page content patterns."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <Example label="Category tiles (gender landing)">
            <ul className="grid grid-cols-3 gap-3">
              {["Necklaces", "Earrings", "Rings", "Bracelets", "Bangles", "Sets"].map((c) => (
                <li key={c}>
                  <Link
                    href={`/women/${c.toLowerCase()}/`}
                    className="group flex aspect-square flex-col justify-end rounded-sm bg-surface-muted p-3 outline-none hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <span className="text-sm font-medium group-hover:underline group-hover:underline-offset-4">{c}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Example>
          <Example label="Accordion (PDP details, footer on mobile)">
            <Accordion type="single" collapsible defaultValue="details">
              <AccordionItem value="details">
                <AccordionTrigger>Details</AccordionTrigger>
                <AccordionContent>Gold-toned brass, freshwater pearls, push-back closure. 6 g per earring.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="care">
                <AccordionTrigger>Care</AccordionTrigger>
                <AccordionContent>Keep away from perfume, water and sweat. Wipe with a soft cloth after wear.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="shipping">
                <AccordionTrigger>Shipping &amp; returns</AccordionTrigger>
                <AccordionContent>Ships in 1–2 days. 7-day returns on unworn pieces with tags.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </Example>
        </div>
      </ShowcaseSection>

      {/* 13 Header */}
      <ShowcaseSection
        id="header"
        number={next()}
        title="Header"
        description="The sticky header at the top of this page is the component: announcement bar, wordmark, primary navigation with mega-menu, search, account, wishlist and bag. On phones it collapses to menu · logo · search · bag."
      >
        <Example label="Behaviour">
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
            <li>56px tall on phones, 72px on desktop; stays visible while scrolling with a hairline shadow.</li>
            <li>Mega-menu opens on hover and on keyboard focus; the panel links are real anchors.</li>
            <li>Bag count is decorative; the button label announces the number of items.</li>
            <li>Announcement bar is dismissible for 7 days and never stacks.</li>
          </ul>
        </Example>
      </ShowcaseSection>

      {/* 14 Footer */}
      <ShowcaseSection
        id="footer"
        number={next()}
        title="Footer"
        description="Four columns on desktop, native accordions on phones, newsletter capture, legal row. See the bottom of this page."
      >
        <Example label="Behaviour">
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
            <li>Columns use the HTML details element on mobile: no JavaScript and keyboard-operable by default.</li>
            <li>The newsletter form is labelled; the submit handler is a stub until the consent module exists.</li>
            <li>Legal links and grievance officer satisfy the Indian e-commerce disclosure rules.</li>
          </ul>
        </Example>
      </ShowcaseSection>

      {/* 15 Modal */}
      <ShowcaseSection id="modal" number={next()} title="Modal" description="Centered dialog, 12px radius, focus trapped, Escape and overlay close, focus returns to the trigger.">
        <DialogDemo />
      </ShowcaseSection>

      {/* 16 Drawer */}
      <ShowcaseSection
        id="drawer"
        number={next()}
        title="Drawer"
        description="Side sheets for the bag and mobile menu, bottom sheets for filters. The page peeks through on phones so the user keeps their bearings."
      >
        <DrawerDemo lines={sampleCartLines} />
      </ShowcaseSection>

      {/* 17 Toast */}
      <ShowcaseSection id="toast" number={next()} title="Toast" description="Bottom-centre, 4 seconds, non-blocking, announced politely.">
        <ToastDemo />
      </ShowcaseSection>

      {/* 18 Tabs */}
      <ShowcaseSection id="tabs" number={next()} title="Tabs" description="Line variant for product information; segmented variant for account and admin.">
        <TabsDemo />
      </ShowcaseSection>

      {/* 19 Breadcrumbs */}
      <ShowcaseSection id="breadcrumbs" number={next()} title="Breadcrumbs" description="Mirror the primary category path. Long product names truncate on phones.">
        <div className="flex flex-col gap-4">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Women", href: "/women/" }, { label: "Earrings", href: "/women/earrings/" }, { label: "Pearl Drop Earrings in Gold Tone" }]} />
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Journal", href: "/journal/" }, { label: "How to style a saree with jewellery" }]} />
        </div>
      </ShowcaseSection>

      {/* 20 Pagination */}
      <ShowcaseSection id="pagination" number={next()} title="Pagination" description="Real links for every page; page 1 resolves to the base URL; bounds render as disabled text, not dead links.">
        <div className="flex flex-col gap-6">
          <StorePagination currentPage={1} totalPages={6} hrefFor={(p) => (p === 1 ? "/women/earrings/" : `/women/earrings/?page=${p}`)} />
          <StorePagination currentPage={7} totalPages={14} hrefFor={(p) => (p === 1 ? "/women/earrings/" : `/women/earrings/?page=${p}`)} />
        </div>
      </ShowcaseSection>

      {/* 21 Loading */}
      <ShowcaseSection id="loading" number={next()} title="Loading states" description="Spinners only inside buttons and small regions. Whole pages use skeletons that match the final layout.">
        <div className="grid gap-6 lg:grid-cols-3">
          <Example label="Spinner">
            <div className="flex items-center gap-4">
              <Spinner className="size-4" />
              <Spinner className="size-6" />
            </div>
          </Example>
          <Example label="Loading region">
            <LoadingBlock label="Loading delivery estimate" />
          </Example>
          <Example label="Button">
            <LoadingButtonDemo />
          </Example>
        </div>
      </ShowcaseSection>

      {/* 22 Empty */}
      <ShowcaseSection id="empty" number={next()} title="Empty states" description="No illustrations. One headline, one line of help, one action.">
        <div className="grid gap-6 lg:grid-cols-2">
          <Example label="Search with no results">
            <EmptyState
              icon={<SearchXIcon strokeWidth={1.5} />}
              title='No results for "jhumkka"'
              description="Check the spelling or try a broader term like earrings."
              action={
                <Button variant="secondary" asChild>
                  <Link href="/women/earrings/">Browse earrings</Link>
                </Button>
              }
            />
          </Example>
          <Example label="Empty wishlist">
            <EmptyState
              icon={<HeartIcon strokeWidth={1.5} />}
              title="Your wishlist is empty"
              description="Tap the heart on any piece to save it here."
              action={
                <Button asChild>
                  <Link href="/collections/new-arrivals/">See new arrivals</Link>
                </Button>
              }
            />
          </Example>
        </div>
      </ShowcaseSection>

      {/* 23 Error */}
      <ShowcaseSection id="error" number={next()} title="Error states" description="Calm, specific, with a next step. Inline for regions; full-page for routes.">
        <div className="flex flex-col gap-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <RetryErrorDemo />
            <Alert variant="warning">
              <TriangleAlertIcon aria-hidden="true" />
              <AlertTitle>Cash on delivery is not available for this pincode</AlertTitle>
              <AlertDescription>You can still pay online with UPI, cards or net banking.</AlertDescription>
            </Alert>
          </div>
          <Example label="Full-page error">
            <PageError
              code="Something went wrong"
              title="We couldn't load this page"
              description="Our team has been notified. Please try again in a moment."
              primary={<Button>Try again</Button>}
              secondary={
                <Button variant="secondary" asChild>
                  <Link href="/">Back to home</Link>
                </Button>
              }
            />
          </Example>
        </div>
      </ShowcaseSection>

      {/* 24 Skeleton */}
      <ShowcaseSection id="skeleton" number={next()} title="Skeleton states" description="Match the final geometry exactly so nothing shifts when data lands.">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <ProductGrid className="xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <li key={i}>
                <ProductCardSkeleton />
              </li>
            ))}
          </ProductGrid>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="mt-6 h-11 w-full" />
          </div>
        </div>
      </ShowcaseSection>

      {first ? (
        <p className="type-small border-t border-line py-10 text-ink-subtle">
          Sample data only. &ldquo;{first.name}&rdquo; and its siblings are placeholders until the catalogue module exists.
        </p>
      ) : null}
    </Container>
  );
}
