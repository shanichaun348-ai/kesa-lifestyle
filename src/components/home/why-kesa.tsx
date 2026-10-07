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

/** Why Kesa: four promises on a dark band, icons in soft rings. */
export function WhyKesa({ facts }: { facts: readonly Fact[] }) {
  return (
    <section aria-labelledby="why-title" className="bg-ink py-14 text-bg lg:py-20">
      <div className="container-page reveal">
        <h2 id="why-title" className="type-eyebrow mb-10 text-center text-bg/60">
          The Kesa promise
        </h2>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {facts.map((f) => {
            const Icon = icons[f.icon];
            return (
              <li key={f.title} className="group/fact flex flex-col items-center gap-4 text-center">
                <span className="inline-flex size-14 items-center justify-center rounded-full border border-bg/20 text-bg transition-[background-color,color,transform] duration-400 ease-(--ease-standard) group-hover/fact:bg-bg group-hover/fact:text-ink motion-safe:group-hover/fact:-translate-y-1">
                  <Icon className="size-6" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <p className="font-display text-lg text-bg">{f.title}</p>
                <p className="type-small max-w-[16rem] text-bg/70">{f.body}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
