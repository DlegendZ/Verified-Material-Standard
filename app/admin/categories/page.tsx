import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { CategoryWeightsForm } from "./weights-form";
import { createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import type { CategoryCriterionRow, MaterialCategoryRow } from "@/lib/types/db";

export const metadata = { title: "Kategori & bobot" };

export default async function AdminCategoriesPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const [{ data: categories }, { data: criteria }] = await Promise.all([
    supabase
      .from("material_categories")
      .select("*")
      .order("status", { ascending: true })
      .order("name", { ascending: true })
      .returns<MaterialCategoryRow[]>(),
    supabase
      .from("category_criteria")
      .select("*")
      .order("sort_order", { ascending: true })
      .returns<CategoryCriterionRow[]>(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kategori & bobot sub-kriteria"
        description="Bobot disimpan sebagai data, bukan konstanta di kode, karena kategori selain Tekstil belum divalidasi Domain Expert."
      />

      {(categories ?? []).map((category) => (
        <Panel key={category.id}>
          <PanelHeader
            title={category.name}
            description={category.notes ?? undefined}
            action={
              <Badge tone={category.status === "live" ? "ok" : "warning"}>
                {category.status === "live" ? "Aktif" : "Segera hadir"}
              </Badge>
            }
          />
          <PanelBody>
            <CategoryWeightsForm
              categoryId={category.id}
              criteria={(criteria ?? []).filter((row) => row.category_id === category.id)}
            />
          </PanelBody>
        </Panel>
      ))}
    </div>
  );
}
