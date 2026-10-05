import Image from "next/image";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import type { UgcPost } from "@/lib/demo/homepage";

type UgcGridProps = {
  handle: string;
  posts: UgcPost[];
};

/**
 * Instagram / UGC section.
 *
 * Architecture: the grid is a dumb renderer over `UgcPost[]`. Posts carry
 * their source, handle and permalink for attribution and are curated in the
 * admin (an `ugc_posts` table) either by manual upload or by importing from
 * the Instagram Graph API. Images are copied into our storage so the
 * homepage never hotlinks Instagram's CDN or ships its embed script.
 */
export function UgcGrid({ handle, posts }: UgcGridProps) {
  return (
    <section aria-labelledby="ugc-title" className="container-page">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="type-eyebrow text-ink-subtle">Worn by you</p>
          <h2 id="ugc-title" className="type-h2">
            #KesaLifestyle
          </h2>
        </div>
        <a
          href={`https://www.instagram.com/${handle}/`}
          rel="noopener"
          target="_blank"
          className="type-small inline-flex items-center gap-1.5 font-medium text-ink underline decoration-line-strong underline-offset-6 hover:decoration-ink"
        >
          Follow @{handle}
          <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
        {posts.map((post) => {
          const target = post.productHref ?? post.permalink;
          const external = !post.productHref;
          const content = (
            <span className="relative block aspect-square overflow-hidden rounded-sm bg-surface-muted">
              <Image
                src={post.image.src}
                alt={post.image.alt}
                fill
                sizes="(min-width: 1024px) 16vw, 33vw"
                unoptimized={post.image.unoptimized ?? false}
                className="object-cover"
              />
            </span>
          );
          return (
            <li key={post.id}>
              {external ? (
                <a
                  href={target}
                  rel="noopener"
                  target="_blank"
                  aria-label={`Post by @${post.handle} on Instagram (opens in a new tab)`}
                  className="block rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  {content}
                </a>
              ) : (
                <Link
                  href={target}
                  aria-label={`Shop the piece worn by @${post.handle}`}
                  className="block rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
