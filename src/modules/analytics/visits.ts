import "server-only";

import { getSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase";

import { type DailyVisitRow, summariseVisits, type VisitStats } from "./visits-shared";

/** Count one storefront page view (and one visitor when it is the first today). Never throws. */
export async function recordVisit(input: { day: string; newVisitor: boolean }): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await getSupabaseServiceClient().rpc("record_site_visit", { p_day: input.day, p_new_visitor: input.newVisitor });
  if (error) console.warn(JSON.stringify({ level: "warn", event: "visit", action: "record_failed", error: error.message, ts: new Date().toISOString() }));
}

const EMPTY: VisitStats = { today: { visitors: 0, pageViews: 0 }, last7Days: { visitors: 0, pageViews: 0 }, allTime: { visitors: 0, pageViews: 0 } };

/** Today, the last seven days and all time, for the admin dashboard. */
export async function visitStats(): Promise<VisitStats> {
  if (!isSupabaseConfigured()) return EMPTY;
  const { data, error } = await getSupabaseServiceClient().from("site_visits_daily").select("day, visitors, page_views");
  if (error || !data) return EMPTY;
  return summariseVisits(data as DailyVisitRow[]);
}
