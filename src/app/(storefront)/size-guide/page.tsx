import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";

export const metadata: Metadata = {
  title: { absolute: "Size Guide | Kesa Lifestyle" },
  description: "Find your ring size, bracelet size and necklace length with Kesa Lifestyle's measuring guide and Indian–US ring size chart.",
  alternates: { canonical: "/size-guide/" },
};

/** Indian ring sizes with inner diameter and circumference; US equivalents are approximate. */
const RING_SIZES: Array<[indian: number, diameterMm: number, circumferenceMm: number, us: string]> = [
  [6, 14.0, 44.0, "3"],
  [7, 14.3, 45.0, "3¼"],
  [8, 14.6, 46.0, "3¾"],
  [9, 15.0, 47.0, "4"],
  [10, 15.3, 48.0, "4½"],
  [11, 15.6, 49.0, "4¾"],
  [12, 15.9, 50.0, "5¼"],
  [13, 16.2, 51.0, "5½"],
  [14, 16.6, 52.0, "6"],
  [15, 16.9, 53.0, "6¼"],
  [16, 17.2, 54.0, "6¾"],
  [17, 17.5, 55.0, "7"],
  [18, 17.8, 56.0, "7½"],
  [19, 18.1, 57.0, "7¾"],
  [20, 18.5, 58.0, "8¼"],
  [21, 18.8, 59.0, "8½"],
  [22, 19.1, 60.0, "9"],
  [23, 19.4, 61.0, "9½"],
  [24, 19.7, 62.0, "9¾"],
];

const NECKLACE_LENGTHS: Array<[inches: number, cm: number, name: string, sits: string]> = [
  [14, 36, "Choker", "Snug at the base of the neck"],
  [16, 41, "Collar", "On the collarbone — most pendants"],
  [18, 46, "Princess", "Just below the collarbone — the everyday length"],
  [20, 51, "Matinee", "Top of the bust — layering, mangalsutra"],
  [22, 56, "", "Mid-bust — long mangalsutra and pendants"],
  [24, 61, "Opera", "Below the bust — statement and layered looks"],
];

const TH = "pb-2 text-left text-xs font-medium uppercase tracking-wider text-ink-subtle";
const TD = "py-2 pr-4 text-sm text-ink-muted";

export default function SizeGuidePage() {
  return (
    <Container className="py-8 lg:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Size guide" }]} />

      <article className="mt-6 max-w-3xl" aria-labelledby="size-title">
        <h1 id="size-title" className="type-h1">Size guide</h1>
        <p className="type-body mt-3 max-w-prose text-ink-muted">
          Three ways to get it right the first time. If you are between sizes, choose the larger one — a slightly loose ring or bracelet is
          comfortable; a tight one is not. Exchanges for a different size are free within 7 days.
        </p>

        <div className="mt-10 space-y-12">
          <section aria-labelledby="rings" className="space-y-5">
            <h2 id="rings" className="type-h2">Rings</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-md border border-line bg-surface p-5">
                <h3 className="type-h3 mb-2">Measure a ring you already own</h3>
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-muted">
                  <li>Pick a ring that fits the same finger well.</li>
                  <li>Lay it on a ruler and measure the <span className="text-ink">inside</span> diameter edge to edge, in millimetres.</li>
                  <li>Match the diameter in the chart below.</li>
                </ol>
              </div>
              <div className="rounded-md border border-line bg-surface p-5">
                <h3 className="type-h3 mb-2">Measure your finger</h3>
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-muted">
                  <li>Wrap a thin strip of paper or thread around the base of the finger, over the knuckle if it is wide.</li>
                  <li>Mark where it overlaps and measure the length in millimetres — that is the circumference.</li>
                  <li>Measure at the end of the day; fingers are smallest in the morning and in cold weather.</li>
                </ol>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border border-line bg-surface p-5">
              <table className="min-w-full">
                <caption className="sr-only">Ring size chart</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th className={TH}>Indian size</th>
                    <th className={TH}>Inner diameter</th>
                    <th className={TH}>Circumference</th>
                    <th className={TH}>US size (approx.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {RING_SIZES.map(([indian, d, c, us]) => (
                    <tr key={indian}>
                      <td className={`${TD} font-medium text-ink`}>{indian}</td>
                      <td className={TD}>{d.toFixed(1)} mm</td>
                      <td className={TD}>{c.toFixed(0)} mm</td>
                      <td className={TD}>{us}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="type-small text-ink-subtle">
              Kesa rings are listed in Indian sizes. Adjustable rings fit sizes 10–18 and are marked as such on the product page.
            </p>
          </section>

          <section aria-labelledby="bracelets" className="space-y-5">
            <h2 id="bracelets" className="type-h2">Bracelets and bangles</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-md border border-line bg-surface p-5">
                <h3 className="type-h3 mb-2">Bracelets (with a clasp)</h3>
                <p className="text-sm text-ink-muted">
                  Wrap a tape or thread around your wrist just below the wrist bone and note the measurement. Add <span className="text-ink">1 cm for a snug fit</span> or{" "}
                  <span className="text-ink">2 cm for a loose, draped fit</span>. Most Kesa bracelets are 17–19 cm with an adjustable extender chain, so one size suits a 15–19 cm wrist.
                </p>
              </div>
              <div className="rounded-md border border-line bg-surface p-5">
                <h3 className="type-h3 mb-2">Bangles (no clasp)</h3>
                <p className="text-sm text-ink-muted">
                  Bring your thumb to your little finger and measure around the widest part of the hand — the bangle must pass over this. Common sizes: <span className="text-ink">2.4</span> (small),{" "}
                  <span className="text-ink">2.6</span> (medium), <span className="text-ink">2.8</span> (large) — the number is the inner diameter in inches.
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="necklaces" className="space-y-5">
            <h2 id="necklaces" className="type-h2">Necklaces, chains and mangalsutra</h2>
            <div className="overflow-x-auto rounded-md border border-line bg-surface p-5">
              <table className="min-w-full">
                <caption className="sr-only">Necklace length guide</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th className={TH}>Length</th>
                    <th className={TH}>Style</th>
                    <th className={TH}>Where it sits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {NECKLACE_LENGTHS.map(([inches, cm, name, sits]) => (
                    <tr key={inches}>
                      <td className={`${TD} font-medium whitespace-nowrap text-ink`}>
                        {inches}&Prime; · {cm} cm
                      </td>
                      <td className={TD}>{name || "—"}</td>
                      <td className={TD}>{sits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="type-small text-ink-subtle">
              Chain lengths are measured end to end including the clasp. Pendant length is listed separately on each product.
            </p>
          </section>

          <section aria-labelledby="help" className="rounded-md border border-line bg-surface-muted/60 p-5">
            <h2 id="help" className="type-h3 mb-2">Still not sure?</h2>
            <p className="text-sm text-ink-muted">
              Send us your measurement on WhatsApp or email <span className="text-ink">hello@kesalifestyle.com</span> and we will confirm the size before you order.
            </p>
          </section>
        </div>
      </article>
    </Container>
  );
}
