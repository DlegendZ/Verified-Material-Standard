import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell";
import {
  ConsistencyNote,
  FinalScoreBreakdown,
  SamplePointTable,
  SubCriteriaDetail,
} from "@/components/grading-breakdown";
import { BatchStatusBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { GradeStamp } from "@/components/ui/grade";
import { DataRow, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { AssignGraderForm } from "./assign-form";
import { IssueButtons } from "./issue-buttons";
import { formatDate, formatPercent, formatWeight } from "@/lib/format";
import type { GradingResult } from "@/lib/scoring";
import { BUCKETS, publicObjectUrl } from "@/lib/storage";
import { createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import { GATES, SAMPLE_POINT_LABELS } from "@/lib/text";
import type {
  BatchPhotoRow,
  BatchRow,
  CertificateRow,
  DocumentationCheckRow,
  GateCheckRow,
  GradingResultRow,
  ProfileRow,
  QuantityCheckRow,
} from "@/lib/types/db";

export const metadata = { title: "Review batch" };

interface AdminBatch extends BatchRow {
  material_categories: { name: string } | null;
  factories: { legal_name: string; city: string; contact_person: string } | null;
}

export default async function AdminBatchReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const { data: batch } = await supabase
    .from("batches")
    .select("*, material_categories(name), factories(legal_name, city, contact_person)")
    .eq("id", id)
    .maybeSingle<AdminBatch>();

  if (!batch) notFound();

  const [
    { data: graders },
    { data: gate },
    { data: grading },
    { data: quantity },
    { data: documentation },
    { data: photos },
    { data: certificate },
  ] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("role", "grader").returns<ProfileRow[]>(),
    supabase.from("gate_checks").select("*").eq("batch_id", id).maybeSingle<GateCheckRow>(),
    supabase
      .from("grading_results")
      .select("*")
      .eq("batch_id", id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle<GradingResultRow>(),
    supabase.from("quantity_checks").select("*").eq("batch_id", id).maybeSingle<QuantityCheckRow>(),
    supabase
      .from("documentation_checks")
      .select("*")
      .eq("batch_id", id)
      .maybeSingle<DocumentationCheckRow>(),
    supabase.from("batch_photos").select("*").eq("batch_id", id).returns<BatchPhotoRow[]>(),
    supabase
      .from("certificates")
      .select("*")
      .eq("batch_id", id)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle<CertificateRow>(),
  ]);

  const breakdown = grading ? (grading.breakdown_json as GradingResult["breakdown"]) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={batch.batch_code}
        description={`${batch.factories?.legal_name ?? "—"} · ${batch.factories?.city ?? "—"}`}
        action={<BatchStatusBadge status={batch.status} />}
      />

      <Panel>
        <PanelHeader title="Data pengajuan" />
        <PanelBody>
          <dl>
            <DataRow label="Kategori material" value={batch.material_categories?.name ?? "—"} />
            <DataRow label="Klaim berat" value={formatWeight(batch.claimed_weight_kg)} mono />
            <DataRow label="Klaim spesifikasi" value={batch.claimed_spec ?? "—"} />
            <DataRow label="Nomor lot" value={batch.lot_number ?? "—"} mono />
            <DataRow label="Tanggal produksi" value={formatDate(batch.production_date)} />
            <DataRow label="Kontak di lokasi" value={batch.factories?.contact_person ?? "—"} />
          </dl>
        </PanelBody>
      </Panel>

      {batch.status === "submitted" ? (
        <Panel>
          <PanelHeader
            title="Tugaskan grader"
            description="Batch pindah ke antrian grader begitu ditugaskan."
          />
          <PanelBody>
            <AssignGraderForm
              batchId={batch.id}
              graders={(graders ?? []).map((grader) => ({
                id: grader.id,
                full_name: grader.full_name,
              }))}
            />
          </PanelBody>
        </Panel>
      ) : null}

      {gate ? (
        <Panel>
          <PanelHeader
            title="Gerbang wajib"
            description="Ketiganya harus lolos sebelum penilaian dimulai."
          />
          <PanelBody className="space-y-3">
            <ul className="space-y-2">
              {GATES.map((item) => {
                const passed = gate[
                  item.key === "nonB3Pass"
                    ? "non_b3_pass"
                    : item.key === "originExistsPass"
                      ? "origin_exists_pass"
                      : "origin_authentic_pass"
                ];
                return (
                  <li key={item.key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-ink">{item.label}</span>
                    <Badge tone={passed ? "ok" : "danger"}>{passed ? "Lolos" : "Gagal"}</Badge>
                  </li>
                );
              })}
            </ul>
            {gate.notes ? (
              <p className="border-t border-line pt-3 text-sm text-ink-muted">{gate.notes}</p>
            ) : null}
          </PanelBody>
        </Panel>
      ) : null}

      {grading && breakdown ? (
        <>
          <Panel>
            <PanelHeader title="Hasil penilaian" description={`Versi rumus ${grading.scoring_version}`} />
            <PanelBody className="space-y-5">
              <GradeStamp grade={grading.grade} finalScore={grading.final_score} />
              <FinalScoreBreakdown breakdown={breakdown} />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Skor per titik sampel" />
            <PanelBody className="space-y-4">
              <SamplePointTable breakdown={breakdown} />
              <ConsistencyNote breakdown={breakdown} />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Rincian sub-kriteria"
              description="Nilai mentah yang diisi grader, termasuk yang diabaikan karena override bau."
            />
            <PanelBody>
              <SubCriteriaDetail breakdown={breakdown} />
            </PanelBody>
          </Panel>
        </>
      ) : null}

      {quantity || documentation ? (
        <Panel>
          <PanelHeader title="Input Langkah 6 & 7" />
          <PanelBody>
            <dl>
              {quantity ? (
                <>
                  <DataRow
                    label="Berat timbang ulang"
                    value={formatWeight(quantity.actual_weight_kg)}
                    mono
                  />
                  <DataRow
                    label="Sampel sesuai spesifikasi"
                    value={formatPercent(quantity.spec_match_pct)}
                    mono
                  />
                </>
              ) : null}
              {documentation ? (
                <>
                  <DataRow
                    label="Tanggal produksi tercantum"
                    value={documentation.has_production_date ? "Ya" : "Tidak"}
                  />
                  <DataRow
                    label="Foto batch multi-sudut"
                    value={documentation.has_multi_angle_photos ? "Ya" : "Tidak"}
                  />
                  <DataRow
                    label="Nomor lot/traceability"
                    value={documentation.has_lot_number ? "Ya" : "Tidak"}
                  />
                  <DataRow
                    label="Hasil uji tambahan"
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
          <PanelHeader title="Foto" />
          <PanelBody>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(photos ?? []).map((photo) => (
                <li key={photo.id} className="border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicObjectUrl(BUCKETS.photos, photo.file_path)}
                    alt={
                      photo.sample_point
                        ? `Titik ${SAMPLE_POINT_LABELS[photo.sample_point]}`
                        : "Foto batch"
                    }
                    className="aspect-4/3 w-full object-cover"
                  />
                  <p className="border-t border-line px-2 py-1 text-xs text-ink-muted">
                    {photo.sample_point
                      ? `Titik ${SAMPLE_POINT_LABELS[photo.sample_point]}`
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
            title="Penerbitan"
            description="Sertifikat diterbitkan Admin, bukan grader — kontrol berlapis (keputusan D1)."
          />
          <PanelBody>
            <IssueButtons batchId={batch.id} grade={grading.grade} />
          </PanelBody>
        </Panel>
      ) : null}

      {certificate ? (
        <Panel>
          <PanelHeader title="Sertifikat terbit" />
          <PanelBody>
            <dl>
              <DataRow label="Nomor sertifikat" value={certificate.certificate_code} mono />
              <DataRow label="Terbit" value={formatDate(certificate.issued_at)} />
              <DataRow label="Berlaku sampai" value={formatDate(certificate.valid_until)} />
              <DataRow label="Status" value={certificate.status} />
            </dl>
          </PanelBody>
        </Panel>
      ) : null}
    </div>
  );
}
