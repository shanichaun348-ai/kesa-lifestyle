import { afterEach, describe, expect, it, vi } from "vitest";

import { getServerEnv, withoutBlanks } from "@/lib/env";

describe("withoutBlanks", () => {
  it("turns empty strings into undefined and leaves other values alone", () => {
    expect(withoutBlanks({ A: "", B: "x", C: undefined })).toEqual({ A: undefined, B: "x", C: undefined });
  });
});

describe("getServerEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("treats blank placeholders from .env files as unset instead of failing validation", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("ORDER_NOTIFY_EMAIL", "");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "");
    vi.stubEnv("CRON_SECRET", "");
    const env = getServerEnv();
    expect(env.RESEND_API_KEY).toBeUndefined();
    expect(env.ORDER_NOTIFY_EMAIL).toBeUndefined();
    expect(env.WHATSAPP_PHONE_NUMBER_ID).toBeUndefined();
    expect(env.CRON_SECRET).toBeUndefined();
  });

  it("still rejects values that are present but malformed", () => {
    vi.stubEnv("ORDER_NOTIFY_EMAIL", "not-an-email");
    expect(() => getServerEnv()).toThrow(/ORDER_NOTIFY_EMAIL/);
  });
});
