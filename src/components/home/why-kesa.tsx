import { LeafIcon, RefreshCwIcon, ShieldCheckIcon, TruckIcon } from "lucide-react";

const icons = {
  shield: ShieldCheckIcon,
  leaf: LeafIcon,
  truck: TruckIcon,
  refresh: RefreshCwIcon,
} as const;

type Fact = {
  title: string;
  body: string;
  icon: keyof typeof icons;
  /** True while the underlying policy awaits an owner decision. */
  pending?: boolean;
};

/** Why Kesa: four trust facts in a quiet row. No cards, no fills. */
export function WhyKesa({ facts }: { facts: readonly Fact[] }) {
  return (
    <section aria-labelledby="why-title" className="container-page">
      <h2 id="why-title" className="sr-only">
        Why shop with Kesa
      </h2>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-8 border-y border-line py-8 lg:grid-cols-4 lg:py-10">
        {facts.map((f) => {
          const Icon = icons[f.icon];
          return (
            <li key={f.title} className="flex flex-col gap-2">
              <Icon className="size-6 text-ink" strokeWidth={1.5} aria-hidden="true" />
              <p className="text-sm font-medium text-ink">{f.title}</p>
              <p className="type-small text-ink-muted">{f.body}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
