import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Menulis jejak audit. Dipanggil untuk setiap aksi penting: verifikasi pabrik,
 * penugasan grader, submit grading, penerbitan, dan pencabutan sertifikat
 * (SRD Bab 11).
 *
 * Kegagalan menulis audit sengaja TIDAK membatalkan aksi utamanya — sertifikat
 * yang sudah terbit tidak boleh hilang hanya karena baris log gagal ditulis.
 * Kegagalannya tetap dicatat ke log server supaya terlihat.
 */
export async function writeAudit(
  supabase: SupabaseClient,
  params: {
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    payload?: unknown;
  },
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: params.actorId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    payload_json: params.payload ?? null,
  });

  if (error) {
    console.error("[audit] gagal menulis jejak audit", {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      message: error.message,
    });
  }
}
