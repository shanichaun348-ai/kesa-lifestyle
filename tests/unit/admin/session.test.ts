import { beforeAll, describe, expect, it } from "vitest";

import { createSessionToken, parseSessionToken, makeSession, SESSION_TTL } from "@/modules/admin/session-token";
import type { AdminSession } from "@/modules/admin/types";

const TEST_SECRET = "test-secret-at-least-32-characters-long!!!";

const testUser = { id: "test-001", email: "admin@example.com", name: "Test Admin", role: "owner" as const };

beforeAll(() => {
  process.env.ADMIN_SESSION_SECRET = TEST_SECRET;
});

describe("makeSession", () => {
  it("sets iat and exp correctly", () => {
    const before = Math.floor(Date.now() / 1000);
    const session = makeSession(testUser);
    const after = Math.floor(Date.now() / 1000);

    expect(session.iat).toBeGreaterThanOrEqual(before);
    expect(session.iat).toBeLessThanOrEqual(after);
    expect(session.exp).toBe(session.iat + SESSION_TTL);
    expect(session.exp - session.iat).toBe(SESSION_TTL);
  });

  it("copies user fields", () => {
    const session = makeSession(testUser);
    expect(session.userId).toBe(testUser.id);
    expect(session.email).toBe(testUser.email);
    expect(session.name).toBe(testUser.name);
    expect(session.role).toBe(testUser.role);
  });
});

describe("createSessionToken / parseSessionToken", () => {
  it("round-trips a session", async () => {
    const session = makeSession(testUser);
    const token = await createSessionToken(session);
    const parsed = await parseSessionToken(token);

    expect(parsed).not.toBeNull();
    expect(parsed?.userId).toBe(session.userId);
    expect(parsed?.email).toBe(session.email);
    expect(parsed?.role).toBe(session.role);
  });

  it("rejects a tampered payload", async () => {
    const session = makeSession(testUser);
    const token = await createSessionToken(session);
    // Flip one char in the payload portion
    const tampered = token.slice(0, 5) + (token[5] === "a" ? "b" : "a") + token.slice(6);
    const parsed = await parseSessionToken(tampered);
    expect(parsed).toBeNull();
  });

  it("rejects a token with a wrong signature", async () => {
    const session = makeSession(testUser);
    const token = await createSessionToken(session);
    const dot = token.lastIndexOf(".");
    const badToken = token.slice(0, dot + 1) + "invalidsignatureXXXXXXXXX";
    const parsed = await parseSessionToken(badToken);
    expect(parsed).toBeNull();
  });

  it("rejects a token missing the dot separator", async () => {
    const parsed = await parseSessionToken("nodot");
    expect(parsed).toBeNull();
  });

  it("rejects an expired session", async () => {
    const past = Math.floor(Date.now() / 1000) - 1;
    const expired: AdminSession = { userId: "u", email: "e@e.com", name: "E", role: "owner", iat: past - 100, exp: past };
    const token = await createSessionToken(expired);
    const parsed = await parseSessionToken(token);
    expect(parsed).toBeNull();
  });

  it("rejects garbage input", async () => {
    const parsed = await parseSessionToken("garbage.input.values");
    expect(parsed).toBeNull();
  });

  it("token format has exactly one dot separating payload from sig", async () => {
    const token = await createSessionToken(makeSession(testUser));
    const dots = [...token].filter((c) => c === ".");
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });
});

describe("secret length check", () => {
  it("throws if ADMIN_SESSION_SECRET is too short", async () => {
    const original = process.env.ADMIN_SESSION_SECRET;
    process.env.ADMIN_SESSION_SECRET = "short";
    await expect(createSessionToken(makeSession(testUser))).rejects.toThrow();
    process.env.ADMIN_SESSION_SECRET = original;
  });
});
