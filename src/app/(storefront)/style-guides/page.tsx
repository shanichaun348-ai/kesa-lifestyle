import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";
import { seedStyleGuides } from "@/lib/demo/seed-style-guides";

export const metadata: Metadata = {
  title: { absolute: "Style Guides | Kesa Lifestyle" },
  description: "How-to styling guides for jewellery: sarees, face shapes, office wear and more.",
  alternates: { canonical: "/style-guides/" },
  robots: { index: true, follow: true },
};

export default function StyleGuidesIndexPage() {
  const guides = [...seedStyleGuides].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <Container className="py-8 lg:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Style Guides" }]} />

      <header className="mt-6 mb-10">
        <h1 className="type-h1">Style Guides</h1>
        <p className="mt-3 max-w-xl type-body text-ink-muted">Practical advice on what to wear, and how to wear it.</p>
      </header>

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => (
          <li key={guide.slug}>
            <article className="group flex h-full flex-col rounded-md border border-line bg-surface overflow-hidden">
              <div className="aspect-[16/9] w-full overflow-hidden bg-surface-muted">
                <Image
                  src={guide.image.src}
                  alt={guide.image.alt}
                  width={800}
                  height={450}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  {...(guide.image.unoptimized ? { unoptimized: true } : {})}
                />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <h2 className="type-h3">
                  <Link href={`/style-guides/${guide.slug}/`} className="hover:text-brand transition-colors">
                    {guide.title}
                  </Link>
                </h2>
                <p className="type-small text-ink-muted line-clamp-3">{guide.excerpt}</p>
                <p className="mt-auto pt-3 type-small text-ink-subtle">
                  <time dateTime={guide.publishedAt}>
                    {new Date(guide.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </time>
                </p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </Container>
  );
}
