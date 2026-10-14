import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RichText } from "@/components/storefront/rich-text";
import { RETURNS_COPY, STORE_PROMISES } from "@/modules/catalog/pdp";
import type { Product } from "@/modules/catalog/types";
import { warrantyMonths } from "@/modules/catalog/warranty";

type Spec = { label: string; value: string | undefined };

function labelFor(slug: string | undefined): string | undefined {
  return slug?.replace(/-/g, " ");
}

const TRIGGER = "font-display text-lg font-normal";
const ITEM = "border-highlight/25";

/**
 * Details, specifications, care, shipping and returns. Server-rendered so
 * every fact is in the HTML for crawlers and for customers without JS. The
 * shipping and returns copy mirrors the policy pages.
 */
export function ProductDetails({ product }: { product: Product }) {
  const warranty = warrantyMonths(product.tags);
  const specs: Spec[] = [
    { label: "Material", value: labelFor(product.attributes.material?.[0]) },
    { label: "Finish", value: labelFor(product.attributes.finish?.[0]) },
    { label: "Colour", value: product.attributes.color?.map((c) => c.replace(/-/g, " ")).join(", ") },
    { label: "Dimensions", value: product.dimensions },
    { label: "Weight", value: product.weightGrams !== undefined ? `${product.weightGrams} g` : undefined },
    { label: "Closure", value: product.primaryCategoryPath.endsWith("earrings") ? "Push back" : undefined },
    { label: "Warranty", value: warranty ? `${warranty} months` : undefined },
    { label: "Country of origin", value: "India" },
    { label: "HSN code", value: product.hsnCode },
  ];
  const returns = RETURNS_COPY[product.returnPolicy];

  return (
    <Accordion type="multiple" defaultValue={["details"]} className="border-t border-highlight/25">
      <AccordionItem value="details" className={ITEM}>
        <AccordionTrigger className={TRIGGER}>Product details</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-5">
            {product.description.length > 0 ? <RichText text={product.description.join("\n")} className="gap-4" /> : null}
            <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-6 gap-y-2 text-sm sm:grid-cols-[minmax(7rem,auto)_1fr_minmax(7rem,auto)_1fr]">
              {specs
                .filter((s): s is { label: string; value: string } => s.value !== undefined)
                .map((s) => (
                  <div key={s.label} className="contents">
                    <dt className="text-ink-subtle">{s.label}</dt>
                    <dd className="text-ink capitalize">{s.value}</dd>
                  </div>
                ))}
            </dl>
          </div>
        </AccordionContent>
      </AccordionItem>

      {product.care ? (
        <AccordionItem value="care" className={ITEM}>
          <AccordionTrigger className={TRIGGER}>Care instructions</AccordionTrigger>
          <AccordionContent>
            <p>{product.care}</p>
            <p className="mt-2">
              <a href="/jewellery-care/" className="text-brand underline underline-offset-4">
                Read the full care guide
              </a>
            </p>
          </AccordionContent>
        </AccordionItem>
      ) : null}

      <AccordionItem value="shipping" className={ITEM}>
        <AccordionTrigger className={TRIGGER}>Shipping</AccordionTrigger>
        <AccordionContent>
          <ul className="grid gap-1.5">
            <li>Free shipping across India on orders over ₹999; flat ₹59 below that.</li>
            <li>Dispatched in {STORE_PROMISES.dispatchDays}; delivery in {STORE_PROMISES.deliveryDays} after dispatch, sooner in metros.</li>
            <li>Cash on delivery available on orders up to ₹5,000.</li>
            <li>Tracking link by email once dispatched.</li>
          </ul>
          <p className="mt-2">
            <a href="/shipping-policy/" className="text-brand underline underline-offset-4">
              Full shipping policy
            </a>
          </p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="returns" className={ITEM}>
        <AccordionTrigger className={TRIGGER}>Returns &amp; exchanges</AccordionTrigger>
        <AccordionContent>
          <p>
            <span className="text-ink">{returns.title}.</span> {returns.detail}
          </p>
          <p className="mt-2">
            <a href="/returns-policy/" className="text-brand underline underline-offset-4">
              Full returns policy
            </a>
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
