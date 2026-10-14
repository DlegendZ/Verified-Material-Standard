import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabasePublicClient } from "./supabase/public";
import { loadPublicCategories } from "./public-categories";
import { PUBLIC_CATEGORY_FALLBACK } from "./text";
import { SEED_CATEGORIES } from "./categories";
vi.mock("./supabase/public", () => ({ createSupabasePublicClient: vi.fn() }));
describe("kategori publik: RPC tanpa cookie dan fallback kurasi", () => {
  beforeEach(() => vi.clearAllMocks());
  it("fallback statis identik dengan data seed", () => {
    expect(PUBLIC_CATEGORY_FALLBACK).toEqual(
      SEED_CATEGORIES.map((c) => ({
        code: c.code,
        name: c.name,
        status: c.status,
        short_description: c.shortDescription,
        certificate_validity_days: c.certificateValidityDays,
        grade_meanings: c.gradeMeanings,
        profiles: c.profiles.map((p) => ({
          code: p.code,
          name: p.name,
          description: p.description,
        })),
      })),
    );
  });
  it("RPC valid dipakai dan field tambahan tidak dipublikasikan", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({
        data: PUBLIC_CATEGORY_FALLBACK.map((c) => ({
          ...c,
          contact_phone: "rahasia",
        })),
        error: null,
      });
    vi.mocked(createSupabasePublicClient).mockReturnValue({ rpc } as never);
    expect(await loadPublicCategories()).toEqual(PUBLIC_CATEGORY_FALLBACK);
    expect(rpc).toHaveBeenCalledWith("public_categories");
  });
  it.each([
    { data: null, error: { message: "RPC belum ada" } },
    { data: [{ code: "rusak" }], error: null },
  ])("RPC gagal/invalid memakai fallback", async (result) => {
    vi.mocked(createSupabasePublicClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue(result),
    } as never);
    expect(await loadPublicCategories()).toEqual(PUBLIC_CATEGORY_FALLBACK);
  });
  it("client tidak tersedia memakai fallback", async () => {
    vi.mocked(createSupabasePublicClient).mockImplementation(() => {
      throw new Error("Env belum lengkap");
    });
    expect(await loadPublicCategories()).toEqual(PUBLIC_CATEGORY_FALLBACK);
  });
});
