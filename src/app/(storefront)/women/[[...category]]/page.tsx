import type { Metadata } from "next";

import { genderRouteMetadata, renderGenderRoute } from "@/components/catalog/gender-route";

export async function generateMetadata(props: PageProps<"/women/[[...category]]">): Promise<Metadata> {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  return genderRouteMetadata("women", params.category, searchParams);
}

export default async function WomenPage(props: PageProps<"/women/[[...category]]">) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  return renderGenderRoute("women", params.category, searchParams);
}
