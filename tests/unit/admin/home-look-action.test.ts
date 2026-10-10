/**
 * updateHomeLook — the admin form that chooses the "Shop the look" pieces.
 * Only live products may be saved, in the order given; database problems
 * come back as a message the owner can act on.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/admin/audit", () => ({ auditLog: vi.fn() }));
vi.mock("@/modules/admin/guard", () => ({ requireAdmin: vi.fn(async () => ({ id: "admin-1", email: "owner@example.com", name: "Owner", role: "owner" })) }));
vi.mock("@/modules/catalog/queries", () => ({ getCatalogRepository: vi.fn() }));
vi.mock("@/modules/content/home-look-server", () => ({ saveHomeLook: vi.fn(async () => ({ ok: true })) }));

import { revalidatePath } from "next/cache";
import { auditLog } from "@/modules/admin/audit";
import { getCatalogRepository } from "@/modules/catalog/queries";
import { saveHomeLook } from "@/modules/content/home-look-server";

import { updateHomeLook } from "../../../src/app/(admin)/admin/content/homepage/_actions";

function form(slugs: string[], href?: string): FormData {
  const fd = new FormData();
  for (const s of slugs) fd.append("slug", s);
  if (href !== undefined) fd.set("href", href);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCatalogRepository).mockReturnValue({
    getProductsBySlugs: vi.fn(async (slugs: string[]) => slugs.filter((s) => s.startsWith("live-")).map((slug) => ({ slug, status: "active" }))),
  } as never);
});

describe("updateHomeLook", () => {
  it("saves live products in the given order and refreshes the home page", async () => {
    const result = await updateHomeLook(null, form(["live-b", "live-a", "live-b"], "/women/necklaces/"));
    expect(result).toEqual({ success: "Saved. 2 pieces are shown beside the photo." });
    expect(vi.mocked(saveHomeLook)).toHaveBeenCalledWith({ productSlugs: ["live-b", "live-a"], href: "/women/necklaces/" });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/");
    expect(vi.mocked(auditLog)).toHaveBeenCalledWith(expect.anything(), "content.update", expect.objectContaining({ key: "home.look" }));
  });

  it("refuses a product that is not published", async () => {
    const result = await updateHomeLook(null, form(["live-a", "draft-x"]));
    expect(result).toEqual({ error: expect.stringContaining("draft-x") });
    expect(vi.mocked(saveHomeLook)).not.toHaveBeenCalled();
  });

  it("refuses more than six pieces and off-site links", async () => {
    expect(await updateHomeLook(null, form(Array.from({ length: 7 }, (_, i) => `live-${i}`)))).toEqual({ error: expect.stringMatching(/at most 6/i) });
    expect(await updateHomeLook(null, form(["live-a"], "https://evil.example/"))).toEqual({ error: expect.stringMatching(/link on this site/i) });
    expect(vi.mocked(saveHomeLook)).not.toHaveBeenCalled();
  });

  it("allows clearing the picks, which falls back to the newest pieces", async () => {
    const result = await updateHomeLook(null, form([]));
    expect(result).toEqual({ success: expect.stringMatching(/newest live pieces/i) });
    expect(vi.mocked(saveHomeLook)).toHaveBeenCalledWith({ productSlugs: [], href: "/collections/new-arrivals/" });
  });

  it("passes a database problem back as the message", async () => {
    vi.mocked(saveHomeLook).mockResolvedValueOnce({ ok: false, error: { code: "missing_table", message: "Run the migration first." } });
    expect(await updateHomeLook(null, form(["live-a"]))).toEqual({ error: "Run the migration first." });
  });
});
