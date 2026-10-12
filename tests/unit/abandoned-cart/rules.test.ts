import { describe, expect, it } from "vitest";

import { orderedSince, reminderAction, type ReminderCandidate } from "@/modules/abandoned-cart/rules";

const NOW = new Date("2026-10-13T12:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

function cart(over: Partial<ReminderCandidate> = {}): ReminderCandidate {
  return { status: "open", consent: true, email: "a@b.in", reminderCount: 0, lastRemindedAt: null, lastActivityAt: hoursAgo(2), itemCount: 1, ...over };
}

describe("reminderAction", () => {
  it("sends the first reminder once the bag has been idle for an hour", () => {
    expect(reminderAction(cart(), NOW)).toBe("first");
    expect(reminderAction(cart({ lastActivityAt: hoursAgo(0.5) }), NOW)).toBe("skip");
  });

  it("never reminds without consent, an email, or items", () => {
    expect(reminderAction(cart({ consent: false }), NOW)).toBe("skip");
    expect(reminderAction(cart({ email: null }), NOW)).toBe("skip");
    expect(reminderAction(cart({ itemCount: 0 }), NOW)).toBe("skip");
  });

  it("sends the second reminder only 23 hours after the first, then stops", () => {
    expect(reminderAction(cart({ status: "reminded", reminderCount: 1, lastRemindedAt: hoursAgo(10), lastActivityAt: hoursAgo(11) }), NOW)).toBe("skip");
    expect(reminderAction(cart({ status: "reminded", reminderCount: 1, lastRemindedAt: hoursAgo(23), lastActivityAt: hoursAgo(24) }), NOW)).toBe("second");
    expect(reminderAction(cart({ status: "reminded", reminderCount: 2, lastRemindedAt: hoursAgo(30), lastActivityAt: hoursAgo(60) }), NOW)).toBe("skip");
  });

  it("expires bags idle for more than seven days regardless of consent", () => {
    expect(reminderAction(cart({ lastActivityAt: hoursAgo(7 * 24 + 1), consent: false }), NOW)).toBe("expire");
  });

  it("leaves converted, unsubscribed and expired bags alone", () => {
    for (const status of ["converted", "unsubscribed", "expired"]) expect(reminderAction(cart({ status }), NOW)).toBe("skip");
  });
});

describe("orderedSince", () => {
  it("is true when any order was placed after the bag's last activity", () => {
    const c = { lastActivityAt: hoursAgo(5) };
    expect(orderedSince(c, [hoursAgo(10)])).toBe(false);
    expect(orderedSince(c, [hoursAgo(10), hoursAgo(1)])).toBe(true);
    expect(orderedSince(c, [])).toBe(false);
  });
});
