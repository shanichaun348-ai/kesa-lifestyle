import type { Metadata } from "next";

import { genderRouteMetadata, renderGenderRoute } from "@/components/catalog/gender-route";

export async function generateMetadata(props: PageProps<"/men/[[...category]]">): Promise<Metadata> {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  return genderRouteMetadata("men", params.category, searchParams);
}

export default async function MenPage(props: PageProps<"/men/[[...category]]">) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  return renderGenderRoute("men", params.category, searchParams);
}
