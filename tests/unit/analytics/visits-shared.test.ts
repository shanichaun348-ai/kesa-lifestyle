import { describe, expect, it } from "vitest";

import { isBot, storeDay, storeDayBefore, summariseVisits } from "@/modules/analytics/visits-shared";

describe("storeDay", () => {
  it("uses the Indian calendar day, not UTC", () => {
    // 21:30 UTC on 21 Oct is 03:00 IST on 22 Oct.
    expect(storeDay(new Date("2026-10-21T21:30:00Z"))).toBe("2026-10-22");
    expect(storeDay(new Date("2026-10-21T18:00:00Z"))).toBe("2026-10-21");
  });

  it("counts back whole days", () => {
    expect(storeDayBefore(6, new Date("2026-10-22T06:00:00Z"))).toBe("2026-10-16");
  });
});

describe("isBot", () => {
  it("ignores crawlers, link previews and monitors", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isBot("WhatsApp/2.23.20 A")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("curl/8.4.0")).toBe(true);
    expect(isBot(null)).toBe(true);
  });

  it("counts real browsers", () => {
    expect(isBot("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36")).toBe(false);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1")).toBe(false);
  });
});

describe("summariseVisits", () => {
  const now = new Date("2026-10-22T06:00:00Z"); // 11:30 IST, 22 Oct
  const rows = [
    { day: "2026-10-22", visitors: 12, page_views: 40 },
    { day: "2026-10-21", visitors: 30, page_views: 90 },
    { day: "2026-10-16", visitors: 5, page_views: 7 }, // 6 days ago: inside the week
    { day: "2026-10-15", visitors: 100, page_views: 300 }, // 7 days ago: outside
    { day: "2026-09-01", visitors: 2, page_views: 2 },
  ];

  it("rolls rows up into today, the last seven days and all time", () => {
    expect(summariseVisits(rows, now)).toEqual({
      today: { visitors: 12, pageViews: 40 },
      last7Days: { visitors: 47, pageViews: 137 },
      allTime: { visitors: 149, pageViews: 439 },
    });
  });

  it("is all zeros with no rows", () => {
    expect(summariseVisits([], now)).toEqual({
      today: { visitors: 0, pageViews: 0 },
      last7Days: { visitors: 0, pageViews: 0 },
      allTime: { visitors: 0, pageViews: 0 },
    });
  });
});
