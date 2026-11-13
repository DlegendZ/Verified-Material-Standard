import { getLocale } from "@/lib/locale-server";
import { PageHeader } from "@/components/app-shell";
import { FactoryStatusBadge } from "@/components/status-badges";
import { FactoryProfileForm } from "./form";
import { createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import type { FactoryRow } from "@/lib/types/db";

export const metadata = { title: "Profil pabrik" };

export default async function FactoryProfilePage() {
  const locale = await getLocale();
  const en = locale === "en";
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
        title={en ? "Factory profile" : "Profil pabrik"}
        description={
          en
            ? "VMS administrators use these details to verify the factory. Some information appears on public certificate pages."
            : "Data ini dipakai Admin untuk memverifikasi pabrik, dan sebagian tampil di halaman verifikasi publik."
        }
        action={
          factory ? (
            <FactoryStatusBadge
              status={factory.verification_status}
              locale={locale}
            />
          ) : null
        }
      />
      <FactoryProfileForm factory={factory ?? null} />
      <p className="mt-4 text-sm text-ink-muted">
        {en
          ? "Only the business name and city are public. The address, contact name, and phone number do not appear on verification pages."
          : "Yang tampil ke publik hanya nama badan usaha dan kota. Alamat lengkap, nama kontak, dan nomor telepon tidak pernah ditampilkan di halaman verifikasi."}
      </p>
    </div>
  );
}
