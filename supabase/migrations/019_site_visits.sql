-- Daily visitor and page-view counts for the admin dashboard. One row per
-- calendar day (IST). Incremented atomically by record_site_visit, which only
-- the server (service role) may call. Additive; idempotent.

CREATE TABLE IF NOT EXISTS site_visits_daily (
  day DATE PRIMARY KEY,
  -- Distinct browsers that day (first page view of a 24-hour visit cookie).
  visitors INTEGER NOT NULL DEFAULT 0,
  -- Every storefront page view that day.
  page_views INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only server code reads or writes this table, through the service role.
ALTER TABLE site_visits_daily ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE site_visits_daily TO service_role;

-- Atomic increment so concurrent page views never lose a count.
CREATE OR REPLACE FUNCTION public.record_site_visit(p_day DATE, p_new_visitor BOOLEAN)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO site_visits_daily (day, visitors, page_views, updated_at)
  VALUES (p_day, CASE WHEN p_new_visitor THEN 1 ELSE 0 END, 1, NOW())
  ON CONFLICT (day) DO UPDATE
    SET visitors   = site_visits_daily.visitors + (CASE WHEN p_new_visitor THEN 1 ELSE 0 END),
        page_views = site_visits_daily.page_views + 1,
        updated_at = NOW();
$$;

-- Not callable with the public (anon) key: counts come only from the server.
REVOKE EXECUTE ON FUNCTION public.record_site_visit(DATE, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_site_visit(DATE, BOOLEAN) TO service_role;
