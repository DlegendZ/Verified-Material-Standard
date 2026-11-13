import { z } from "zod";
import { createSupabasePublicClient } from "./supabase/public";

export const CATALOG_PAGE_SIZE = 12;

export function catalogFilters(params: {
  q?: unknown;
  grade?: unknown;
  page?: unknown;
}) {
  const page =
    typeof params.page === "string" && /^\d+$/.test(params.page)
      ? Number(params.page)
      : 1;
  return {
    q: typeof params.q === "string" ? params.q.trim().slice(0, 100) : "",
    grade:
      params.grade === "A" || params.grade === "B" || params.grade === "C"
        ? params.grade
        : "",
    page: Math.max(1, Math.min(page, 10_000)),
  };
}

const catalogSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(
    z.object({
      certificate_code: z.string(),
      batch_code: z.string(),
      valid_until: z.string(),
      claimed_weight_kg: z.number(),
      declared_material_type: z.string().nullable(),
      factory_name: z.string(),
      city: z.string(),
      category_code: z.string(),
      category_name: z.string(),
      grade: z.enum(["A", "B", "C"]),
      final_score: z.number(),
      photo_path: z.string().nullable(),
    }),
  ),
  featured: z.array(
    z.object({
      factory_name: z.string(),
      city: z.string(),
      active_batches: z.number().int(),
      grade_a_batches: z.number().int(),
      best_score: z.number(),
    }),
  ),
});

export async function loadVerifiedCatalog({
  q,
  grade,
  page,
}: ReturnType<typeof catalogFilters>) {
  try {
    const { data, error } = await createSupabasePublicClient().rpc(
      "public_verified_catalog",
      {
        p_query: q,
        p_grade: grade,
        p_page: page,
      },
    );
    const parsed = catalogSchema.safeParse(data);
    return !error && parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
