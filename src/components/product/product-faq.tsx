import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { FaqItem } from "@/modules/catalog/types";

/** FAQ block. The page emits matching FAQPage JSON-LD. */
export function ProductFaq({ items }: { items: FaqItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="faq-title" className="border-t border-line pt-10">
      <p className="type-eyebrow text-ink-subtle">FAQ</p>
      <h2 id="faq-title" className="type-h2 mt-2 mb-4">
        Questions, answered
      </h2>
      <Accordion type="single" collapsible className="max-w-3xl">
        {items.map((f, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger>{f.question}</AccordionTrigger>
            <AccordionContent>{f.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
