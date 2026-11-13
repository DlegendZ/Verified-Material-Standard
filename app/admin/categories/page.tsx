import { getLocale } from "@/lib/locale-server";
import { categoryName, profileName, woodGradesEn } from "@/lib/public-english";
import { chemicalGateEn, criteriaHelpEn } from "@/lib/assessment-english";
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
  const locale = await getLocale();
  const en = locale === "en";
  const text = en
    ? {
        title: "Categories and sub-criteria weights",
        description:
          "Weights are stored as data. All pilot weights are preliminary and await expert validation.",
        noCategories: "No active categories.",
        active: "Active",
        validity: "Certificate validity",
        days: (n: number) => n + " days",
        validityNotSet: "Not set",
        odorCap: "Odor override score",
        profiles: "Material forms",
        methods: "Scoring methods",
        unitCount: "Count passing units",
        scale: "Scale 0–100",
        measurementRequired: "+ measurement method required",
        noCriteria:
          "No validated criteria yet. This category is not open for assessment.",
      }
    : CATEGORY_ADMIN_TEXT;
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
      <PageHeader title={text.title} description={text.description} />
      {!(categories ?? []).length ? (
        <EmptyState title={text.noCategories} />
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
              title={categoryName(locale, category.code, category.name)}
              description={
                en
                  ? category.code === "solid_wood"
                    ? "Pilot for solid wood production residues."
                    : undefined
                  : (category.short_description ?? undefined)
              }
              action={
                <Badge tone={category.status === "live" ? "ok" : "neutral"}>
                  {category.status === "live"
                    ? text.active
                    : en
                      ? "Coming soon"
                      : PUBLIC_TEXT.comingSoonBadge}
                </Badge>
              }
            />
            <PanelBody className="space-y-5">
              <dl>
                <DataRow
                  label={text.validity}
                  value={
                    category.certificate_validity_days
                      ? text.days(category.certificate_validity_days)
                      : text.validityNotSet
                  }
                />
                {odor ? (
                  <DataRow
                    label={text.odorCap}
                    value={String(odor.odor_override_cap ?? 40)}
                  />
                ) : null}
              </dl>
              {!en && category.notes ? (
                <p className="text-sm text-ink-muted">{category.notes}</p>
              ) : null}
              {forms.length ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-ink">
                    {text.profiles}
                  </h3>
                  {forms.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl border border-line p-3"
                    >
                      <p className="font-medium text-ink">
                        {profileName(locale, p.code, p.name)}
                      </p>
                      <p className="text-sm text-ink-muted">
                        {en
                          ? `Inspect ${p.units_per_point} units at each of the top, middle, and bottom points.`
                          : `${p.point_definition} · ${GRADER_TEXT.inspect(p.units_per_point, p.unit_label)}`}
                      </p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {en
                          ? p.claim_mode === "bundle"
                            ? "Open the bundles before inspecting."
                            : "Collect a handful of loose offcuts per point."
                          : p.sampling_notes}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              <GradeMeaningTable
                categoryName={categoryName(
                  locale,
                  category.code,
                  category.name,
                )}
                locale={locale}
                meanings={
                  en && category.code === "solid_wood"
                    ? woodGradesEn
                    : category.grade_meanings
                }
              />
              {rows.length ? (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-ink">
                      {text.methods}
                    </h3>
                    {rows.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-xl border border-line p-3"
                      >
                        <p className="mb-2 text-sm font-medium text-ink">
                          {en
                            ? (criteriaHelpEn[row.sub_key]?.[0] ?? row.label)
                            : row.label}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone="neutral">
                            {row.scoring_method === "unit_count"
                              ? text.unitCount
                              : text.scale}
                          </Badge>
                          {row.requires_measurement_method ? (
                            <Badge tone="brand">
                              {text.measurementRequired}
                            </Badge>
                          ) : null}
                        </div>
                        {row.help_text ? (
                          <p className="mt-2 text-sm text-ink-muted">
                            {en
                              ? (criteriaHelpEn[row.sub_key]?.[1] ??
                                row.help_text)
                              : row.help_text}
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
                <p className="text-sm text-ink-muted">{text.noCriteria}</p>
              )}
              {category.non_b3_extra ? (
                <p className="text-sm text-ink-muted">
                  {en && category.code === "solid_wood"
                    ? chemicalGateEn
                    : category.non_b3_extra}
                </p>
              ) : null}
              {category.odor_level3_hint ? (
                <p className="text-sm text-ink-muted">
                  {en && category.code === "solid_wood"
                    ? "Strong mold or rot odor triggers the cleanliness override. Chemical odor fails the Non-B3 gate."
                    : category.odor_level3_hint}
                </p>
              ) : null}
              {category.claim_boundary ? (
                <p className="text-sm text-ink-muted">
                  {en && category.code === "solid_wood"
                    ? "VMS grades describe condition and declared specifications. They do not test structural strength."
                    : category.claim_boundary}
                </p>
              ) : null}
              {category.threshold_disclaimer ? (
                <p className="text-sm text-ink-muted">
                  {en && category.code === "solid_wood"
                    ? "Defect thresholds and dimension tolerances are preliminary and await expert validation."
                    : category.threshold_disclaimer}
                </p>
              ) : null}
            </PanelBody>
          </Panel>
        );
      })}
    </div>
  );
}
