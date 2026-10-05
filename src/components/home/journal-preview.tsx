import Image from "next/image";
import Link from "next/link";

import { SectionHeading } from "@/components/storefront/section-heading";
import type { DemoImage } from "@/lib/demo/homepage";

type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readingMinutes: number;
  image: DemoImage;
};

/** Journal preview: three latest stories. */
export function JournalPreview({ posts }: { posts: readonly Post[] }) {
  return (
    <section aria-labelledby="journal-title" className="container-page">
      <SectionHeading
        eyebrow="Journal"
        title="Stories, care and styling"
        action={{ label: "Read the journal", href: "/journal/" }}
        className="mb-6"
      />
      <ul className="grid gap-8 md:grid-cols-3 md:gap-6">
        {posts.map((post) => (
          <li key={post.slug}>
            <article className="group/post relative flex flex-col">
              <div className="relative aspect-[3/2] overflow-hidden rounded-sm bg-surface-muted">
                <Image
                  src={post.image.src}
                  alt={post.image.alt}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  unoptimized={post.image.unoptimized ?? false}
                  className="object-cover"
                />
              </div>
              <p className="type-eyebrow mt-4 text-ink-subtle">
                {post.category} · {post.readingMinutes} min read
              </p>
              <h3 className="type-h3 mt-2">
                <Link
                  href={`/journal/${post.slug}/`}
                  className="outline-none after:absolute after:inset-0 after:rounded-sm after:content-[''] group-hover/post:underline group-hover/post:underline-offset-4 focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-brand"
                >
                  {post.title}
                </Link>
              </h3>
              <p className="type-small mt-1 text-ink-muted">{post.excerpt}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
