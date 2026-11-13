import { getLocale } from "@/lib/locale-server";
import {
  declarationsEn,
  gatesEn,
  samplePointsEn,
} from "@/lib/assessment-english";
import { categoryName, profileName, woodGradesEn } from "@/lib/public-english";
import { claimedSpecSummary } from "@/lib/claims";
import { BatchDocuments } from "@/components/batch-documents";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell";
import { GradeMeaningTable } from "@/components/grade-meaning-table";
import { SamplingGuide } from "@/components/sampling-guide";
import {
  ConsistencyNote,
  FinalScoreBreakdown,
  SamplePointTable,
  SubCriteriaDetail,
  QuantityDetail,
} from "@/components/grading-breakdown";
import { BatchStatusBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { GradeStamp } from "@/components/ui/grade";
import { DataRow, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { AssignGraderForm } from "./assign-form";
import { IssueButtons } from "./issue-buttons";
import { formatDate, formatPercent, formatWeight } from "@/lib/format";
import { normalizeBreakdown } from "@/lib/breakdown";
import { BUCKETS, publicObjectUrl } from "@/lib/storage";
import { createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import {
  GATES,
  SAMPLE_POINT_LABELS,
  BATCH_FORM_TEXT,
  CLAIM_TEXT,
  REVISION_TEXT,
} from "@/lib/text";
import type {
  BatchPhotoRow,
  BatchRow,
  CertificateRow,
  DocumentationCheckRow,
  GateCheckRow,
  GradingResultRow,
  QuantityCheckRow,
  MaterialCategoryRow,
  MaterialFormProfileRow,
} from "@/lib/types/db";

export const metadata = { title: "Review batch" };

interface AdminBatch extends BatchRow {
  material_categories: MaterialCategoryRow | null;
  material_form_profiles: MaterialFormProfileRow | null;
  factories: {
    legal_name: string;
    city: string;
    contact_person: string;
  } | null;
}

export default async function AdminBatchReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await getLocale();
  const en = locale === "en";
  const { id } = await params;
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const { data: batch } = await supabase
    .from("batches")
    .select(
      "*, material_categories(*), material_form_profiles(*), factories(legal_name, city, contact_person)",
    )
    .eq("id", id)
    .maybeSingle<AdminBatch>();

  if (!batch) notFound();
  const category = batch.material_categories;
  const profile = batch.material_form_profiles;
  const materialLabel = category
    ? categoryName(locale, category.code, category.name)
    : "—";
  const formLabel = profile
    ? profileName(locale, profile.code, profile.name)
    : "—";
  const claim =
    en && batch.claimed_spec_detail && profile && batch.declared_material_type
      ? claimedSpecSummary(
          batch.claimed_spec_detail,
          { name: formLabel },
          batch.declared_material_type,
          batch.claimed_weight_kg,
          locale,
        )
      : batch.claimed_spec;

  const [
    { data: graders, error: gradersError },
    { data: gate },
    { data: grading },
    { data: quantity },
    { data: documentation },
    { data: photos },
    { data: certificate },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "grader")
      .eq("grader_available", true)
      .order("full_name"),
    supabase
      .from("gate_checks")
      .select("*")
      .eq("batch_id", id)
      .maybeSingle<GateCheckRow>(),
    supabase
      .from("grading_results")
      .select("*")
      .eq("batch_id", id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle<GradingResultRow>(),
    supabase
      .from("quantity_checks")
      .select("*")
      .eq("batch_id", id)
      .maybeSingle<QuantityCheckRow>(),
    supabase
      .from("documentation_checks")
      .select("*")
      .eq("batch_id", id)
      .maybeSingle<DocumentationCheckRow>(),
    supabase
      .from("batch_photos")
      .select("*")
      .eq("batch_id", id)
      .returns<BatchPhotoRow[]>(),
    supabase
      .from("certificates")
      .select("*")
      .eq("batch_id", id)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle<CertificateRow>(),
  ]);

  const breakdown = grading
    ? normalizeBreakdown(grading.breakdown_json, grading.scoring_version)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={batch.batch_code}
        description={`${batch.factories?.legal_name ?? "—"} · ${batch.factories?.city ?? "—"}`}
        action={<BatchStatusBadge status={batch.status} locale={locale} />}
      />

      <Panel>
        <PanelHeader title={en ? "Submission details" : "Data pengajuan"} />
        <PanelBody>
          <dl>
            <DataRow
              label={en ? "Material category" : "Kategori material"}
              value={materialLabel}
            />
            <DataRow
              label={en ? "Material form" : CLAIM_TEXT.formProfile}
              value={formLabel}
            />
            <DataRow
              label={
                en ? "Declared wood species" : CLAIM_TEXT.declaredMaterialType
              }
              value={batch.declared_material_type ?? "—"}
            />
            <DataRow
              label={en ? "Declared weight" : "Klaim berat"}
              value={formatWeight(batch.claimed_weight_kg, locale)}
              mono
            />
            <DataRow
              label={en ? "Declared specifications" : "Klaim spesifikasi"}
              value={claim ?? "—"}
            />
            <DataRow
              label={en ? "Lot number" : "Nomor lot"}
              value={batch.lot_number ?? "—"}
              mono
            />
            <DataRow
              label={en ? "Production date" : "Tanggal produksi"}
              value={formatDate(batch.production_date, locale)}
            />
            <DataRow
              label={en ? "On-site contact" : "Kontak di lokasi"}
              value={batch.factories?.contact_person ?? "—"}
            />
          </dl>
          {batch.intake_declarations ? (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold text-ink">
                {en ? "Batch declarations" : BATCH_FORM_TEXT.declarations}
              </h3>
              {(
                [
                  "sourceIsProductionResidue",
                  "noChemicalTreatment",
                  "singleForm",
                ] as const
              ).map((key) => (
                <p key={key} className="text-sm text-ink-muted">
                  {batch.intake_declarations?.[key] ? "✓" : "—"}{" "}
                  {(en ? declarationsEn : REVISION_TEXT.declarations)[key]}
                </p>
              ))}
            </div>
          ) : null}
        </PanelBody>
      </Panel>

      <SamplingGuide
        locale={locale}
        categoryName={materialLabel}
        profile={batch.material_form_profiles}
        claimedSpec={claim}
        thresholdDisclaimer={
          batch.material_categories?.threshold_disclaimer ?? null
        }
      />

      <BatchDocuments supabase={supabase} batchId={batch.id} />

      {batch.status === "submitted" ? (
        <Panel>
          <PanelHeader
            title={en ? "Assign a grader" : "Tugaskan grader"}
            description={
              en
                ? "Once assigned, the batch appears in the grader’s queue."
                : "Batch pindah ke antrian grader begitu ditugaskan."
            }
          />
          <PanelBody>
            {gradersError ? (
              <p role="alert" className="text-sm text-danger">
                {en ? "Could not load available graders." : "Daftar grader yang tersedia gagal dimuat."}
              </p>
            ) : (
              <AssignGraderForm batchId={batch.id} graders={graders ?? []} />
            )}
          </PanelBody>
        </Panel>
      ) : null}

      {gate ? (
        <Panel>
          <PanelHeader
            title={en ? "Required gate checks" : "Gerbang wajib"}
            description={
              en
                ? "All three checks must pass before scoring."
                : "Ketiganya harus lolos sebelum penilaian dimulai."
            }
          />
          <PanelBody className="space-y-3">
            <ul className="space-y-2">
              {(en ? gatesEn : GATES).map((item) => {
                const passed =
                  gate[
                    item.key === "nonB3Pass"
                      ? "non_b3_pass"
                      : item.key === "originExistsPass"
                        ? "origin_exists_pass"
                        : "origin_authentic_pass"
                  ];
                return (
                  <li
                    key={item.key}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-ink">{item.label}</span>
                    <Badge tone={passed ? "ok" : "danger"}>
                      {passed
                        ? en
                          ? "Passed"
                          : "Lolos"
                        : en
                          ? "Failed"
                          : "Gagal"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
            {gate.notes ? (
              <p className="border-t border-line pt-3 text-sm text-ink-muted">
                {gate.notes}
              </p>
            ) : null}
          </PanelBody>
        </Panel>
      ) : null}

      {grading && breakdown ? (
        <>
          <Panel>
            <PanelHeader
              title={en ? "Assessment results" : "Hasil penilaian"}
              description={`${en ? "Scoring version" : "Versi rumus"} ${grading.scoring_version}`}
            />
            <PanelBody className="space-y-5">
              <GradeStamp
                locale={locale}
                grade={grading.grade}
                finalScore={grading.final_score}
              />
              <GradeMeaningTable
                locale={locale}
                categoryName={materialLabel}
                meanings={
                  en && category?.code === "solid_wood"
                    ? woodGradesEn
                    : category?.grade_meanings
                }
                grade={grading.grade}
              />
              <FinalScoreBreakdown locale={locale} breakdown={breakdown} />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title={en ? "Scores by sample point" : "Skor per titik sampel"}
            />
            <PanelBody className="space-y-4">
              <SamplePointTable locale={locale} breakdown={breakdown} />
              <ConsistencyNote locale={locale} breakdown={breakdown} />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title={en ? "Sub-criteria details" : "Rincian sub-kriteria"}
              description={
                en
                  ? "Original entries, including any scores excluded by the odor override."
                  : "Nilai mentah yang diisi grader, termasuk yang diabaikan karena override bau."
              }
            />
            <PanelBody>
              <SubCriteriaDetail locale={locale} breakdown={breakdown} />
              <div className="mt-4">
                <QuantityDetail
                  locale={locale}
                  breakdown={breakdown}
                  scoringVersion={grading.scoring_version}
                  weighingMoistureNote={quantity?.weighing_moisture_note}
                />
              </div>
            </PanelBody>
          </Panel>
        </>
      ) : null}

      {quantity || documentation ? (
        <Panel>
          <PanelHeader
            title={
              en ? "Quantity and documentation inputs" : "Input Langkah 6 & 7"
            }
          />
          <PanelBody>
            <dl>
              {quantity ? (
                <>
                  <DataRow
                    label={en ? "Measured weight" : "Berat timbang ulang"}
                    value={formatWeight(quantity.actual_weight_kg)}
                    mono
                  />
                  <DataRow
                    label={
                      en
                        ? "Samples within specification"
                        : "Sampel sesuai spesifikasi"
                    }
                    value={formatPercent(quantity.spec_match_pct)}
                    mono
                  />
                </>
              ) : null}
              {documentation ? (
                <>
                  <DataRow
                    label={
                      en
                        ? "Production date recorded"
                        : "Tanggal produksi tercantum"
                    }
                    value={documentation.has_production_date ? "Ya" : "Tidak"}
                  />
                  <DataRow
                    label={
                      en ? "Multi-angle batch photos" : "Foto batch multi-sudut"
                    }
                    value={
                      documentation.has_multi_angle_photos ? "Ya" : "Tidak"
                    }
                  />
                  <DataRow
                    label={
                      en
                        ? "Lot / traceability number"
                        : "Nomor lot/traceability"
                    }
                    value={documentation.has_lot_number ? "Ya" : "Tidak"}
                  />
                  <DataRow
                    label={
                      en ? "Additional test results" : "Hasil uji tambahan"
                    }
                    value={documentation.has_lab_test ? "Ya" : "Tidak"}
                  />
                </>
              ) : null}
            </dl>
          </PanelBody>
        </Panel>
      ) : null}

      {(photos ?? []).length > 0 ? (
        <Panel>
          <PanelHeader title={en ? "Photos" : "Foto"} />
          <PanelBody>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(photos ?? []).map((photo) => (
                <li key={photo.id} className="border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicObjectUrl(BUCKETS.photos, photo.file_path)}
                    alt={
                      photo.sample_point
                        ? en
                          ? samplePointsEn[photo.sample_point]
                          : `Titik ${SAMPLE_POINT_LABELS[photo.sample_point]}`
                        : en
                          ? "Batch photo"
                          : "Foto batch"
                    }
                    className="aspect-4/3 w-full object-cover"
                  />
                  <p className="border-t border-line px-2 py-1 text-xs text-ink-muted">
                    {photo.sample_point
                      ? en
                        ? samplePointsEn[photo.sample_point]
                        : `Titik ${SAMPLE_POINT_LABELS[photo.sample_point]}`
                      : en
                        ? "Batch photo"
                        : "Foto batch"}
                  </p>
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>
      ) : null}

      {batch.status === "computed" && grading ? (
        <Panel>
          <PanelHeader
            title={en ? "Issue a certificate" : "Penerbitan"}
            description={
              en
                ? "An administrator reviews the assessment and issues the certificate."
                : "Sertifikat diterbitkan Admin, bukan grader — kontrol berlapis (keputusan D1)."
            }
          />
          <PanelBody>
            <IssueButtons batchId={batch.id} grade={grading.grade} />
          </PanelBody>
        </Panel>
      ) : null}

      {certificate ? (
        <Panel>
          <PanelHeader
            title={en ? "Issued certificate" : "Sertifikat terbit"}
          />
          <PanelBody>
            <dl>
              <DataRow
                label={en ? "Certificate number" : "Nomor sertifikat"}
                value={certificate.certificate_code}
                mono
              />
              <DataRow
                label={en ? "Issued" : "Terbit"}
                value={formatDate(certificate.issued_at, locale)}
              />
              <DataRow
                label={en ? "Valid until" : "Berlaku sampai"}
                value={formatDate(certificate.valid_until, locale)}
              />
              <DataRow label="Status" value={certificate.status} />
            </dl>
          </PanelBody>
        </Panel>
      ) : null}
    </div>
  );
}
