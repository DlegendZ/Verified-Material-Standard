"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { generateBatchCode } from "@/lib/certificate";
import { AuthorizationError, createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import { ERRORS } from "@/lib/text";
import type { FactoryRow } from "@/lib/types/db";
import { batchDraftSchema, factoryProfileSchema } from "@/lib/validation/schemas";

export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
}

function fieldErrorsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

function toNumber(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "").replace(",", ".");
  return raw.trim() === "" ? NaN : Number(raw);
}

/** Membuat atau memperbarui profil pabrik milik pengguna yang sedang login. */
export async function saveFactoryProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireRole("factory");
    const parsed = factoryProfileSchema.safeParse({
      legalName: String(formData.get("legalName") ?? ""),
      address: String(formData.get("address") ?? ""),
      city: String(formData.get("city") ?? ""),
      contactPerson: String(formData.get("contactPerson") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
    });
    if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error.issues) };

    const supabase = await createSupabaseServerClient();
    const { data: existing } = await supabase
      .from("factories")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle<Pick<FactoryRow, "id">>();

    const payload = {
      owner_id: user.id,
      legal_name: parsed.data.legalName,
      address: parsed.data.address,
      city: parsed.data.city,
      contact_person: parsed.data.contactPerson,
      contact_phone: parsed.data.contactPhone,
    };

    const { error } = existing
      ? await supabase.from("factories").update(payload).eq("id", existing.id)
      : await supabase.from("factories").insert(payload);

    if (error) return { error: error.message };

    await writeAudit(supabase, {
      actorId: user.id,
      action: existing ? "factory.profile_updated" : "factory.profile_created",
      entityType: "factory",
      entityId: existing?.id ?? null,
    });

    revalidatePath("/factory", "layout");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }
}

/**
 * Menyimpan batch sebagai draft. Pabrik yang belum diverifikasi boleh sampai
 * tahap ini, tapi tidak boleh submit (SRD Bab 6.1).
 */
export async function createBatchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let newBatchId: string | null = null;

  try {
    const user = await requireRole("factory");
    const parsed = batchDraftSchema.safeParse({
      categoryId: String(formData.get("categoryId") ?? ""),
      claimedWeightKg: toNumber(formData.get("claimedWeightKg")),
      claimedSpec: String(formData.get("claimedSpec") ?? ""),
      productionDate: String(formData.get("productionDate") ?? ""),
      lotNumber: String(formData.get("lotNumber") ?? ""),
      description: String(formData.get("description") ?? ""),
    });
    if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error.issues) };

    const supabase = await createSupabaseServerClient();
    const { data: factory } = await supabase
      .from("factories")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle<Pick<FactoryRow, "id">>();
    if (!factory) return { error: "Lengkapi profil pabrik dulu sebelum mengajukan batch." };

    // Kategori "Segera Hadir" tidak boleh dipilih (keputusan D5).
    const { data: category } = await supabase
      .from("material_categories")
      .select("status, is_active")
      .eq("id", parsed.data.categoryId)
      .maybeSingle<{ status: string; is_active: boolean }>();
    if (!category || !category.is_active || category.status !== "live") {
      return { error: "Kategori itu belum bisa diajukan. Pilih kategori lain." };
    }

    const { data: inserted, error } = await supabase
      .from("batches")
      .insert({
        factory_id: factory.id,
        category_id: parsed.data.categoryId,
        batch_code: generateBatchCode(),
        claimed_weight_kg: parsed.data.claimedWeightKg,
        claimed_spec: parsed.data.claimedSpec || null,
        production_date: parsed.data.productionDate || null,
        lot_number: parsed.data.lotNumber || null,
        description: parsed.data.description || null,
        status: "draft",
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !inserted) return { error: error?.message ?? ERRORS.generic };

    await writeAudit(supabase, {
      actorId: user.id,
      action: "batch.created",
      entityType: "batch",
      entityId: inserted.id,
    });

    newBatchId = inserted.id;
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }

  revalidatePath("/factory");
  redirect(`/factory/batches/${newBatchId}`);
}

/** Mengirim batch ke antrian Admin. Wajib pabrik sudah verified. */
export async function submitBatchAction(batchId: string): Promise<ActionState> {
  try {
    const user = await requireRole("factory");
    const supabase = await createSupabaseServerClient();

    const { data: factory } = await supabase
      .from("factories")
      .select("id, verification_status")
      .eq("owner_id", user.id)
      .maybeSingle<Pick<FactoryRow, "id" | "verification_status">>();

    if (!factory) return { error: "Profil pabrik belum ada." };
    if (factory.verification_status !== "verified") {
      return { error: ERRORS.factoryNotVerified };
    }

    const { data: batch } = await supabase
      .from("batches")
      .select("id, status, factory_id")
      .eq("id", batchId)
      .maybeSingle<{ id: string; status: string; factory_id: string }>();

    if (!batch || batch.factory_id !== factory.id) return { error: ERRORS.unauthorized };
    if (batch.status !== "draft") return { error: "Batch ini sudah diajukan." };

    const { error } = await supabase
      .from("batches")
      .update({ status: "submitted" })
      .eq("id", batchId);
    if (error) return { error: error.message };

    await writeAudit(supabase, {
      actorId: user.id,
      action: "batch.submitted",
      entityType: "batch",
      entityId: batchId,
    });

    revalidatePath("/factory");
    revalidatePath(`/factory/batches/${batchId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }
}

/**
 * Mencatat file yang sudah diunggah client ke Storage.
 *
 * Parameternya posisional supaya bisa di-bind dari Server Component:
 * `attachBatchFileAction.bind(null, batchId, "photo")`.
 */
export async function attachBatchFileAction(
  batchId: string,
  kind: "photo" | "origin_doc" | "lab_test",
  filePath: string,
): Promise<ActionState> {
  try {
    const user = await requireRole("factory");
    const supabase = await createSupabaseServerClient();

    const { data: batch } = await supabase
      .from("batches")
      .select("id, status, factories!inner(owner_id)")
      .eq("id", batchId)
      .maybeSingle<{ id: string; status: string; factories: { owner_id: string } }>();

    if (!batch || batch.factories.owner_id !== user.id) return { error: ERRORS.unauthorized };
    if (batch.status !== "draft" && batch.status !== "submitted") {
      return { error: "Batch ini sudah masuk proses penilaian, berkas tidak bisa diubah lagi." };
    }

    const { error } =
      kind === "photo"
        ? await supabase.from("batch_photos").insert({
            batch_id: batchId,
            file_path: filePath,
            sample_point: null,
            angle_label: null,
          })
        : await supabase.from("batch_documents").insert({
            batch_id: batchId,
            kind,
            file_path: filePath,
          });

    if (error) return { error: error.message };

    revalidatePath(`/factory/batches/${batchId}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthorizationError) return { error: error.message };
    throw error;
  }
}
