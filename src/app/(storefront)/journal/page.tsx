import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { Container } from "@/components/storefront/container";
import { seedJournalArticles } from "@/lib/demo/seed-journal";

export const metadata: Metadata = {
  title: { absolute: "Journal | Kesa Lifestyle" },
  description: "Styling guides, care tips and jewellery inspiration from the Kesa Lifestyle team.",
  alternates: { canonical: "/journal/" },
  robots: { index: true, follow: true },
};

export default function JournalIndexPage() {
  const articles = [...seedJournalArticles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <Container className="py-8 lg:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Journal" }]} />

      <header className="mt-6 mb-10">
        <h1 className="type-h1">Journal</h1>
        <p className="mt-3 max-w-xl type-body text-ink-muted">Styling guides, care tips and jewellery inspiration.</p>
      </header>

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <li key={article.slug}>
            <article className="group flex h-full flex-col rounded-md border border-line bg-surface overflow-hidden">
              <div className="aspect-[16/9] w-full overflow-hidden bg-surface-muted">
                <Image
                  src={article.image.src}
                  alt={article.image.alt}
                  width={800}
                  height={450}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  {...(article.image.unoptimized ? { unoptimized: true } : {})}
                />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <p className="type-eyebrow text-brand">{article.category}</p>
                <h2 className="type-h3">
                  <Link href={`/journal/${article.slug}/`} className="hover:text-brand transition-colors">
                    {article.title}
                  </Link>
                </h2>
                <p className="type-small text-ink-muted line-clamp-3">{article.excerpt}</p>
                <div className="mt-auto pt-3 flex items-center justify-between">
                  <time className="type-small text-ink-subtle" dateTime={article.publishedAt}>
                    {new Date(article.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </time>
                  <span className="type-small text-ink-subtle">{article.readingMinutes} min read</span>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </Container>
  );
}
