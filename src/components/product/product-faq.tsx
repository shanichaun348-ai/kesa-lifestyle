import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { FaqItem } from "@/modules/catalog/types";

/** FAQ block. The page emits matching FAQPage JSON-LD. */
export function ProductFaq({ items }: { items: FaqItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="faq-title" className="border-t border-highlight/25 pt-10">
      <p className="type-eyebrow text-highlight">FAQ</p>
      <h2 id="faq-title" className="type-h2 mt-2">
        Questions, answered
      </h2>
      <span className="lux-divider mt-3 mb-5" aria-hidden="true" />
      <Accordion type="single" collapsible className="max-w-3xl border-highlight/25">
        {items.map((f, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border-highlight/25">
            <AccordionTrigger className="font-display text-lg font-normal">{f.question}</AccordionTrigger>
            <AccordionContent>{f.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
