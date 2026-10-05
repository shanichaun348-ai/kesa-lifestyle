import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Product, ReturnPolicy } from "@/modules/catalog/types";

const RETURN_COPY: Record<ReturnPolicy, string> = {
  returnable: "7-day returns on unworn pieces with tags; refund to the original payment method (window pending decision D7).",
  exchange_only: "Exchange only, for hygiene reasons. Damaged or incorrect items are replaced free of charge.",
  final_sale: "Final sale. Not eligible for return or exchange.",
};

type Spec = { label: string; value: string | undefined };

function labelFor(slug: string | undefined): string | undefined {
  return slug?.replace(/-/g, " ");
}

/**
 * Details, specifications, care, shipping and returns. Server-rendered so
 * every fact is in the HTML for crawlers and for customers without JS.
 */
export function ProductDetails({ product }: { product: Product }) {
  const specs: Spec[] = [
    { label: "Material", value: labelFor(product.attributes.material?.[0]) },
    { label: "Finish", value: labelFor(product.attributes.finish?.[0]) },
    { label: "Colour", value: product.attributes.color?.map((c) => c.replace(/-/g, " ")).join(", ") },
    { label: "Dimensions", value: product.dimensions },
    { label: "Weight", value: product.weightGrams !== undefined ? `${product.weightGrams} g` : undefined },
    { label: "Closure", value: product.primaryCategoryPath.endsWith("earrings") ? "Push back" : undefined },
    { label: "Country of origin", value: "India" },
    { label: "HSN code", value: product.hsnCode },
  ];

  return (
    <Accordion type="multiple" defaultValue={["details"]} className="border-t-0">
      <AccordionItem value="details">
        <AccordionTrigger>Product details</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-4">
            {product.description.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
            <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-6 gap-y-1.5 text-sm">
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

      <AccordionItem value="care">
        <AccordionTrigger>Care instructions</AccordionTrigger>
        <AccordionContent>
          <p>{product.care}</p>
          <p className="mt-2">
            <a href="/jewellery-care/" className="text-brand underline underline-offset-4">
              Read the full care guide
            </a>
          </p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="shipping">
        <AccordionTrigger>Shipping</AccordionTrigger>
        <AccordionContent>
          <ul className="list-disc space-y-1 pl-5">
            <li>Dispatched in 1–2 business days from Mumbai.</li>
            <li>Delivery across India in 3–7 days; metros usually sooner.</li>
            <li>Free shipping on orders over ₹999, flat ₹79 below (pending decision D4).</li>
            <li>Tracking link by email and on your order page.</li>
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="returns">
        <AccordionTrigger>Returns &amp; exchanges</AccordionTrigger>
        <AccordionContent>
          <p>{RETURN_COPY[product.returnPolicy]}</p>
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
