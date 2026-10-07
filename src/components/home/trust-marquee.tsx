type TrustMarqueeProps = {
  items: readonly string[];
};

function row(items: readonly string[], hidden: boolean) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-6 pr-6 text-xs font-medium uppercase tracking-[0.14em] sm:text-sm">
          <span>{item}</span>
          <span aria-hidden="true" className="text-highlight">✦</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Scrolling strip of store promises under the hero. Content is duplicated
 * once (aria-hidden) so the loop is seamless; screen readers hear it once.
 */
export function TrustMarquee({ items }: TrustMarqueeProps) {
  return (
    <section aria-label="Why shop with Kesa" className="overflow-hidden border-y border-ink/10 bg-surface-muted py-3.5 text-ink">
      <div className="marquee-track">
        {row(items, false)}
        {row(items, true)}
      </div>
    </section>
  );
}
