import type { JsonLdObject } from "@/modules/seo/structured-data";

/**
 * Renders one or more JSON-LD objects. `<` is escaped so user-influenced
 * strings can never close the script tag (docs/11 §4).
 */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
