/**
 * Visitor counting rules shared by the beacon route and the dashboard.
 * Pure and dependency-free so they are unit-testable.
 */

/** Name of the 24-hour cookie that marks a browser as already counted today. */
export const VISIT_COOKIE = "kesa_visit";
export const VISIT_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;

/** Store days are Indian calendar days, whatever the server's clock zone. */
export const STORE_TIME_ZONE = "Asia/Kolkata";

const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** `YYYY-MM-DD` for `at` in the store's time zone. */
export function storeDay(at: Date = new Date()): string {
  return dayFormatter.format(at);
}

/** The store day `daysAgo` days before `at`. */
export function storeDayBefore(daysAgo: number, at: Date = new Date()): string {
  return storeDay(new Date(at.getTime() - daysAgo * 24 * 60 * 60 * 1000));
}

const BOT_UA = /bot|crawl|spider|slurp|fetch|preview|monitor|uptime|headless|lighthouse|pagespeed|curl|wget|python-requests|httpclient|facebookexternalhit|whatsapp|telegram|discord|slack|skype|pinterest|embedly|quora link|vkshare|w3c_validator|google-structured-data/i;

/** Crawlers, link unfurlers and monitors are not shoppers. */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  return BOT_UA.test(userAgent);
}

export type VisitStats = {
  today: { visitors: number; pageViews: number };
  last7Days: { visitors: number; pageViews: number };
  allTime: { visitors: number; pageViews: number };
};

export type DailyVisitRow = { day: string; visitors: number; page_views: number };

/** Roll daily rows up into the three figures the dashboard shows. */
export function summariseVisits(rows: readonly DailyVisitRow[], at: Date = new Date()): VisitStats {
  const today = storeDay(at);
  const weekStart = storeDayBefore(6, at);
  const stats: VisitStats = {
    today: { visitors: 0, pageViews: 0 },
    last7Days: { visitors: 0, pageViews: 0 },
    allTime: { visitors: 0, pageViews: 0 },
  };
  for (const row of rows) {
    stats.allTime.visitors += row.visitors;
    stats.allTime.pageViews += row.page_views;
    if (row.day >= weekStart && row.day <= today) {
      stats.last7Days.visitors += row.visitors;
      stats.last7Days.pageViews += row.page_views;
    }
    if (row.day === today) {
      stats.today.visitors += row.visitors;
      stats.today.pageViews += row.page_views;
    }
  }
  return stats;
}
