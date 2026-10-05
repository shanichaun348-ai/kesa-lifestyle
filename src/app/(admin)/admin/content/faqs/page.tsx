import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/modules/admin/guard";

const SAMPLE_FAQS = [
  { id: "faq_001", question: "What is your return policy?", answer: "We accept returns within 7 days of delivery for unworn pieces with original tags.", category: "Returns" },
  { id: "faq_002", question: "Is the jewellery safe for sensitive skin?", answer: "Yes. All our pieces use nickel-safe base metals with hypoallergenic plating.", category: "Products" },
  { id: "faq_003", question: "How do I track my order?", answer: "You will receive a tracking link via email once your order is dispatched.", category: "Shipping" },
  { id: "faq_004", question: "Do you offer gift wrapping?", answer: "Gift wrapping is available at checkout for a small fee.", category: "Orders" },
];

export default async function FaqsPage() {
  await requireAdmin("content:write");

  return (
    <div className="space-y-6">
      <PageHeader
        title="FAQs"
        back={{ href: "/admin/content/", label: "Content" }}
        actions={
          <button className="inline-flex h-9 items-center rounded-md border border-ink bg-ink px-4 text-sm font-medium text-bg hover:border-brand-hover hover:bg-brand-hover">
            + Add FAQ
          </button>
        }
      />

      <div className="space-y-3">
        {SAMPLE_FAQS.map((faq) => (
          <div key={faq.id} className="rounded-md border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{faq.question}</p>
                <p className="mt-1 text-sm text-ink-muted">{faq.answer}</p>
                <p className="mt-1 text-xs text-ink-subtle">{faq.category}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="text-sm text-brand hover:underline">Edit</button>
                <button className="text-sm text-danger hover:underline">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-subtle">FAQ management requires Postgres (D10). Changes are demo only.</p>
    </div>
  );
}
