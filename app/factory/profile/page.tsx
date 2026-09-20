import { PageHeader } from "@/components/app-shell";
import { FactoryStatusBadge } from "@/components/status-badges";
import { FactoryProfileForm } from "./form";
import { createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import type { FactoryRow } from "@/lib/types/db";

export const metadata = { title: "Profil pabrik" };

export default async function FactoryProfilePage() {
  const user = await requireRole("factory");
  const supabase = await createSupabaseServerClient();

  const { data: factory } = await supabase
    .from("factories")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle<FactoryRow>();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Profil pabrik"
        description="Data ini dipakai Admin untuk memverifikasi pabrik, dan sebagian tampil di halaman verifikasi publik."
        action={factory ? <FactoryStatusBadge status={factory.verification_status} /> : null}
      />
      <FactoryProfileForm factory={factory ?? null} />
      <p className="mt-4 text-sm text-ink-muted">
        Yang tampil ke publik hanya nama badan usaha dan kota. Alamat lengkap, nama kontak, dan
        nomor telepon tidak pernah ditampilkan di halaman verifikasi.
      </p>
    </div>
  );
}
