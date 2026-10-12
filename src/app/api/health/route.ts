import { getSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Liveness + readiness for monitoring. Reports the deployed commit so the
 * post-deploy smoke test can wait for the right build, and whether the
 * database answers a trivial query. Never includes secrets or row data.
 */
export async function GET(): Promise<Response> {
  const startedAt = Date.now();
  let database: "ok" | "error" | "unconfigured" = "unconfigured";
  let detail: string | undefined;

  if (isSupabaseConfigured()) {
    try {
      const { error } = await getSupabaseServiceClient().from("cat_products").select("id", { count: "exact", head: true }).limit(1);
      database = error ? "error" : "ok";
      if (error) detail = error.message;
    } catch (err) {
      database = "error";
      detail = err instanceof Error ? err.message : "unknown";
    }
  }

  const healthy = database === "ok";
  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      ...(detail ? { detail } : {}),
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      latencyMs: Date.now() - startedAt,
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
