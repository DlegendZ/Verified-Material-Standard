import { PageHeader } from "@/components/app-shell";
import { GradeMeaningTable } from "@/components/grade-meaning-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataRow, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { CategoryWeightsForm } from "./weights-form";
import { createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import { CATEGORY_ADMIN_TEXT, GRADER_TEXT, PUBLIC_TEXT } from "@/lib/text";
import type {
  CategoryCriterionRow,
  MaterialCategoryRow,
  MaterialFormProfileRow,
} from "@/lib/types/db";
export const metadata = { title: CATEGORY_ADMIN_TEXT.title };
export default async function AdminCategoriesPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const [{ data: categories }, { data: criteria }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("material_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .returns<MaterialCategoryRow[]>(),
      supabase
        .from("category_criteria")
        .select("*")
        .order("sort_order")
        .returns<CategoryCriterionRow[]>(),
      supabase
        .from("material_form_profiles")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .returns<MaterialFormProfileRow[]>(),
    ]);
  return (
    <div className="space-y-6">
      <PageHeader
        title={CATEGORY_ADMIN_TEXT.title}
        description={CATEGORY_ADMIN_TEXT.description}
      />
      {!(categories ?? []).length ? (
        <EmptyState title={CATEGORY_ADMIN_TEXT.noCategories} />
      ) : null}
      {(categories ?? []).map((category) => {
        const rows = (criteria ?? []).filter(
          (c) => c.category_id === category.id,
        );
        const forms = (profiles ?? []).filter(
          (p) => p.category_id === category.id,
        );
        const odor = rows.find((r) => r.is_odor);
        return (
          <Panel key={category.id}>
            <PanelHeader
              title={category.name}
              description={category.short_description ?? undefined}
              action={
                <Badge tone={category.status === "live" ? "ok" : "neutral"}>
                  {category.status === "live"
                    ? CATEGORY_ADMIN_TEXT.active
                    : PUBLIC_TEXT.comingSoonBadge}
                </Badge>
              }
            />
            <PanelBody className="space-y-5">
              <dl>
                <DataRow
                  label={CATEGORY_ADMIN_TEXT.validity}
                  value={
                    category.certificate_validity_days
                      ? CATEGORY_ADMIN_TEXT.days(
                          category.certificate_validity_days,
                        )
                      : CATEGORY_ADMIN_TEXT.validityNotSet
                  }
                />
                {odor ? (
                  <DataRow
                    label={CATEGORY_ADMIN_TEXT.odorCap}
                    value={String(odor.odor_override_cap ?? 40)}
                  />
                ) : null}
              </dl>
              {category.notes ? (
                <p className="text-sm text-ink-muted">{category.notes}</p>
              ) : null}
              {forms.length ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-ink">
                    {CATEGORY_ADMIN_TEXT.profiles}
                  </h3>
                  {forms.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl border border-line p-3"
                    >
                      <p className="font-medium text-ink">{p.name}</p>
                      <p className="text-sm text-ink-muted">
                        {p.point_definition} ·{" "}
                        {GRADER_TEXT.inspect(p.units_per_point, p.unit_label)}
                      </p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {p.sampling_notes}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              <GradeMeaningTable
                categoryName={category.name}
                meanings={category.grade_meanings}
              />
              {rows.length ? (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-ink">
                      {CATEGORY_ADMIN_TEXT.methods}
                    </h3>
                    {rows.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-xl border border-line p-3"
                      >
                        <p className="mb-2 text-sm font-medium text-ink">
                          {row.label}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone="neutral">
                            {row.scoring_method === "unit_count"
                              ? CATEGORY_ADMIN_TEXT.unitCount
                              : CATEGORY_ADMIN_TEXT.scale}
                          </Badge>
                          {row.requires_measurement_method ? (
                            <Badge tone="brand">
                              {CATEGORY_ADMIN_TEXT.measurementRequired}
                            </Badge>
                          ) : null}
                        </div>
                        {row.help_text ? (
                          <p className="mt-2 text-sm text-ink-muted">
                            {row.help_text}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <CategoryWeightsForm
                    categoryId={category.id}
                    criteria={rows}
                  />
                </>
              ) : (
                <p className="text-sm text-ink-muted">
                  {CATEGORY_ADMIN_TEXT.noCriteria}
                </p>
              )}
              {category.non_b3_extra ? (
                <p className="text-sm text-ink-muted">
                  {category.non_b3_extra}
                </p>
              ) : null}
              {category.odor_level3_hint ? (
                <p className="text-sm text-ink-muted">
                  {category.odor_level3_hint}
                </p>
              ) : null}
              {category.claim_boundary ? (
                <p className="text-sm text-ink-muted">
                  {category.claim_boundary}
                </p>
              ) : null}
              {category.threshold_disclaimer ? (
                <p className="text-sm text-ink-muted">
                  {category.threshold_disclaimer}
                </p>
              ) : null}
            </PanelBody>
          </Panel>
        );
      })}
    </div>
  );
}
