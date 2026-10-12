import { describe, expect, it } from "vitest";

import { courierName, isCourierId, resolveTrackingUrl, trackingUrlFor } from "@/modules/shipping/couriers";

describe("trackingUrlFor", () => {
  it("builds deep links for couriers with a per-consignment page", () => {
    expect(trackingUrlFor("delhivery", "1234567890123")).toBe("https://www.delhivery.com/track/package/1234567890123");
    expect(trackingUrlFor("bluedart", "AB 123")).toBe("https://www.bluedart.com/tracking?trackingNumber=AB%20123");
    expect(trackingUrlFor("ecom", "X1")).toContain("ecomexpress.in");
    expect(trackingUrlFor("xpressbees", "X1")).toContain("xpressbees.com");
    expect(trackingUrlFor("shiprocket", "X1")).toBe("https://shiprocket.co/tracking/X1");
  });

  it("returns null where there is no reliable deep link", () => {
    expect(trackingUrlFor("dtdc", "D123")).toBeNull();
    expect(trackingUrlFor("indiapost", "EE123456789IN")).toBeNull();
    expect(trackingUrlFor("other", "123")).toBeNull();
    expect(trackingUrlFor("delhivery", "   ")).toBeNull();
  });
});

describe("resolveTrackingUrl", () => {
  it("prefers a valid explicit link over the derived one", () => {
    expect(resolveTrackingUrl("delhivery", "123", "https://example.com/t/123")).toBe("https://example.com/t/123");
  });

  it("falls back to the derived link when the explicit one is blank or not a URL", () => {
    expect(resolveTrackingUrl("delhivery", "123", "")).toBe("https://www.delhivery.com/track/package/123");
    expect(resolveTrackingUrl("delhivery", "123", "not a url")).toBe("https://www.delhivery.com/track/package/123");
    expect(resolveTrackingUrl("delhivery", "123", "javascript:alert(1)")).toBe("https://www.delhivery.com/track/package/123");
  });

  it("stores nothing for couriers without a deep link and no explicit URL", () => {
    expect(resolveTrackingUrl("dtdc", "123", null)).toBeNull();
  });
});

describe("courier helpers", () => {
  it("recognises known ids and names them", () => {
    expect(isCourierId("delhivery")).toBe(true);
    expect(isCourierId("fedex")).toBe(false);
    expect(courierName("bluedart")).toBe("Blue Dart");
    expect(courierName(null)).toBeNull();
    expect(courierName("legacy-value")).toBe("legacy-value");
  });
});
