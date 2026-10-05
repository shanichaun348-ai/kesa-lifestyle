import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

import { seedMediaSources } from "@/lib/demo/seed-catalog";

/**
 * `/media/products/{slug}/{slug}-{n}.svg` — first-party, stable media URLs
 * (ADR-30). In production this route streams the object from storage; today
 * it maps each product image URL onto a neutral placeholder file so the URL
 * structure, caching and image SEO can be exercised before photography exists.
 */
const SEGMENT = /^[a-z0-9-]+$/;
const FILE = /^([a-z0-9-]+)-(\d+)\.svg$/;
const PLACEHOLDER_DIR = path.join(process.cwd(), "public", "placeholders");

export async function GET(_request: NextRequest, context: RouteContext<"/media/[...path]">) {
  const { path: segments } = await context.params;
  const [kind, slug, file] = segments;
  if (kind !== "products" || !slug || !file || segments.length !== 3 || !SEGMENT.test(slug)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const match = FILE.exec(file);
  if (!match || match[1] !== slug) return new NextResponse("Not found", { status: 404 });

  const index = Number(match[2]) - 1;
  const source = seedMediaSources[slug]?.[index];
  if (!source || !/^[a-z0-9-]+\.svg$/.test(source)) return new NextResponse("Not found", { status: 404 });

  try {
    const body = await readFile(path.join(PLACEHOLDER_DIR, source));
    return new NextResponse(body, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
