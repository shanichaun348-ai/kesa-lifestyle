import { NextResponse, type NextRequest } from "next/server";

import { isAuthorisedJobRequest } from "@/lib/jobs/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { orderedSince, reminderAction } from "@/modules/abandoned-cart/rules";
import { emailRemindedSince, expireStaleCarts, listReminderCandidates, markCartConverted, recordReminder } from "@/modules/abandoned-cart/store";
import { listOrdersForCustomer } from "@/modules/admin/orders-data";
import { sendCartReminder } from "@/modules/notifications/abandoned-cart";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled (hourly via GitHub Actions, daily via Vercel Cron as a fallback):
 * send bag reminders to shoppers who consented, at most two per bag, and
 * expire bags idle for more than seven days. Batches ≤ 100 per run.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorisedJobRequest(request)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const now = new Date();
  const summary = { expired: 0, candidates: 0, sentFirst: 0, sentSecond: 0, converted: 0, skipped: 0, failed: 0 };
  const remindedThisRun = new Set<string>();

  try {
    summary.expired = await expireStaleCarts(now);
    const carts = await listReminderCandidates(now);
    summary.candidates = carts.length;

    for (const cart of carts) {
      const action = reminderAction({ ...cart, itemCount: cart.items.length }, now);
      if (action === "skip" || action === "expire") {
        summary.skipped += 1;
        continue;
      }
      // Bought since they last touched the bag (possibly on another device): close it quietly.
      const orders = await listOrdersForCustomer(cart.email!);
      const since = orders.filter((o) => orderedSince(cart, [o.createdAt]));
      if (since.length > 0) {
        await markCartConverted(cart.token, since[0]!.id);
        summary.converted += 1;
        continue;
      }
      // One reminder per address per day, whatever the number of bags that carry it: a script
      // creating bags for someone else's address cannot turn the store into a spam source.
      const address = cart.email!.toLowerCase();
      if (remindedThisRun.has(address) || (await emailRemindedSince(address, new Date(now.getTime() - 24 * 60 * 60 * 1000)))) {
        summary.skipped += 1;
        continue;
      }
      remindedThisRun.add(address);
      const result = await sendCartReminder(cart, action === "second");
      if (!result.email.ok) {
        summary.failed += 1;
        continue;
      }
      await recordReminder(cart.id, cart.reminderCount + 1, now);
      if (action === "first") summary.sentFirst += 1;
      else summary.sentSecond += 1;
    }
  } catch (err) {
    console.error(JSON.stringify({ level: "error", event: "job", job: "abandoned-carts", error: err instanceof Error ? err.message : "unknown", ts: now.toISOString() }));
    return NextResponse.json({ error: "job_failed", ...summary }, { status: 500 });
  }

  console.log(JSON.stringify({ level: "info", event: "job", job: "abandoned-carts", ...summary, ts: now.toISOString() }));
  return NextResponse.json(summary);
}
