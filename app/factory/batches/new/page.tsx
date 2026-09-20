import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { NewBatchForm } from "./form";
import { createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import { ERRORS } from "@/lib/text";
import type { FactoryRow, MaterialCategoryRow } from "@/lib/types/db";

export const metadata = { title: "Ajukan batch" };

export default async function NewBatchPage() {
  const user = await requireRole("factory");
  const supabase = await createSupabaseServerClient();

  const { data: factory } = await supabase
    .from("factories")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle<FactoryRow>();

  const { data: categories } = await supabase
    .from("material_categories")
    .select("*")
    .eq("is_active", true)
    .order("status", { ascending: true })
    .order("name", { ascending: true })
    .returns<MaterialCategoryRow[]>();

  if (!factory) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Ajukan batch" />
        <EmptyState
          title="Profil pabrik belum diisi"
          description="Isi profil pabrik dulu supaya grader tahu ke mana harus datang mengambil sampel."
          action={
            <Link href="/factory/profile">
              <Button>Isi profil pabrik</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Ajukan batch"
        description="Satu pengajuan = satu batch/lot, bukan per satuan barang."
      />

      {factory.verification_status !== "verified" ? (
        <p className="mb-5 border border-warning bg-warning-soft px-3 py-2 text-sm text-warning">
          {ERRORS.factoryNotVerified}
        </p>
      ) : null}

      <NewBatchForm categories={categories ?? []} />
    </div>
  );
}
