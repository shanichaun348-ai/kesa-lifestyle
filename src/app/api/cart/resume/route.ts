import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase";
import { resumeTokenSchema } from "@/modules/abandoned-cart/schemas";
import { getResumeItems } from "@/modules/abandoned-cart/store";

export const dynamic = "force-dynamic";

/** GET /api/cart/resume/?token= — the saved bag's items for a reminder link. Items only, never who it belongs to. */
export async function GET(request: NextRequest) {
  const noStore = { headers: { "Cache-Control": "private, no-store" } };
  if (!isSupabaseConfigured()) return NextResponse.json({ items: [] }, noStore);
  const token = resumeTokenSchema.safeParse(request.nextUrl.searchParams.get("token"));
  if (!token.success) return NextResponse.json({ error: "Invalid link." }, { status: 400, ...noStore });
  const items = await getResumeItems(token.data);
  if (!items) return NextResponse.json({ error: "This bag is no longer available." }, { status: 404, ...noStore });
  return NextResponse.json({ items }, noStore);
}
