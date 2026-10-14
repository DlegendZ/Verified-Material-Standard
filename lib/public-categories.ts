import { z } from "zod";
import { createSupabasePublicClient } from "./supabase/public";
import { PUBLIC_CATEGORY_FALLBACK } from "./text";
import type { PublicCategory } from "./types/db";
const categorySchema = z.object({
  code: z.string(),
  name: z.string(),
  status: z.enum(["live", "coming_soon"]),
  short_description: z.string().nullable(),
  certificate_validity_days: z.number().int().positive().nullable(),
  grade_meanings: z
    .object({ A: z.string(), B: z.string(), C: z.string(), D: z.string() })
    .nullable(),
  profiles: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      description: z.string().nullable(),
    }),
  ),
});
/** Client tanpa cookie; fallback kurasi tersedia saat RPC belum terpasang/tidak terjangkau. */
export async function loadPublicCategories(): Promise<PublicCategory[]> {
  try {
    const { data, error } =
      await createSupabasePublicClient().rpc("public_categories");
    if (!error) {
      const parsed = z.array(categorySchema).safeParse(data);
      if (parsed.success) return parsed.data;
    }
  } catch {}
  return PUBLIC_CATEGORY_FALLBACK;
}
