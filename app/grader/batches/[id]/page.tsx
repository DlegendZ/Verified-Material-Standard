import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell";
import { SamplingGuide } from "@/components/sampling-guide";
import {
  ConsistencyNote,
  FinalScoreBreakdown,
  SamplePointTable,
} from "@/components/grading-breakdown";
import { BatchStatusBadge } from "@/components/status-badges";
import { GradeStamp } from "@/components/ui/grade";
import { DataRow, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { GateForm } from "./gate-form";
import { GradingWizard } from "./wizard";
import { attachSamplePhotoAction } from "../../actions";
import { toCategoryConfig } from "@/lib/category-config";
import { formatDate, formatWeight } from "@/lib/format";
import { createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import { BATCH_STATUS_HINT, ERRORS } from "@/lib/text";
import type {
  BatchRow,
  CategoryCriterionRow,
  GateCheckRow,
  GradingResultRow,
  MaterialCategoryRow,
  MaterialFormProfileRow,
} from "@/lib/types/db";

export const metadata = { title: "Penilaian batch" };

interface GraderBatch extends BatchRow {
  material_categories: MaterialCategoryRow | null;
  material_form_profiles: MaterialFormProfileRow | null;
  factories: {
    legal_name: string;
    city: string;
    address: string;
    contact_person: string;
  } | null;
}

export default async function GraderBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("grader");
  const supabase = await createSupabaseServerClient();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id")
    .eq("batch_id", id)
    .eq("grader_id", user.id)
    .maybeSingle<{ id: string }>();
  if (!assignment) notFound();

  const { data: batch } = await supabase
    .from("batches")
    .select(
      "*, material_categories(*), material_form_profiles(*), factories(legal_name, city, address, contact_person)",
    )
    .eq("id", id)
    .maybeSingle<GraderBatch>();
  if (!batch) notFound();

  const [{ data: criteria }, { data: gate }, { data: grading }] =
    await Promise.all([
      supabase
        .from("category_criteria")
        .select("*")
        .eq("category_id", batch.category_id)
        .order("sort_order", { ascending: true })
        .returns<CategoryCriterionRow[]>(),
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
    ]);

  const category = toCategoryConfig(
    batch.material_categories ?? { code: "unknown", name: "—" },
    criteria ?? [],
  );

  const gatePassed =
    gate?.non_b3_pass === true &&
    gate?.origin_exists_pass === true &&
    gate?.origin_authentic_pass === true;

  return (
    <div className="space-y-5">
      <PageHeader
        title={batch.batch_code}
        description={BATCH_STATUS_HINT[batch.status]}
        action={<BatchStatusBadge status={batch.status} />}
      />

      <Panel>
        <PanelHeader
          title={batch.factories?.legal_name ?? "—"}
          description={batch.factories?.address}
        />
        <PanelBody>
          <dl>
            <DataRow label="Kategori material" value={category.name} />
            <DataRow
              label="Klaim berat"
              value={formatWeight(batch.claimed_weight_kg)}
              mono
            />
            <DataRow
              label="Klaim spesifikasi"
              value={batch.claimed_spec ?? "—"}
            />
            <DataRow label="Nomor lot" value={batch.lot_number ?? "—"} mono />
            <DataRow
              label="Tanggal produksi"
              value={formatDate(batch.production_date)}
            />
            <DataRow
              label="Kontak di lokasi"
              value={batch.factories?.contact_person ?? "—"}
            />
          </dl>
        </PanelBody>
      </Panel>

      <SamplingGuide
        categoryName={category.name}
        profile={batch.material_form_profiles}
        claimedSpec={batch.claimed_spec}
        thresholdDisclaimer={
          batch.material_categories?.threshold_disclaimer ?? null
        }
      />

      {batch.status === "rejected_gate" ? (
        <Panel className="border-danger">
          <PanelHeader
            title="Batch ditolak di gerbang wajib"
            description="Proses berhenti di sini. Tidak ada skor dan tidak ada sertifikat."
          />
          {gate?.notes ? (
            <PanelBody>
              <p className="text-sm text-ink-muted">{gate.notes}</p>
            </PanelBody>
          ) : null}
        </Panel>
      ) : grading ? (
        <Panel>
          <PanelHeader
            title="Hasil sudah dikirim"
            description="Menunggu Admin meninjau dan menerbitkan sertifikat."
          />
          <PanelBody className="space-y-5">
            <GradeStamp
              grade={grading.grade}
              finalScore={grading.final_score}
            />
            <FinalScoreBreakdown
              breakdown={grading.breakdown_json}
              scoringVersion={grading.scoring_version}
            />
            <SamplePointTable
              breakdown={grading.breakdown_json}
              scoringVersion={grading.scoring_version}
            />
            <ConsistencyNote
              breakdown={grading.breakdown_json}
              scoringVersion={grading.scoring_version}
            />
          </PanelBody>
        </Panel>
      ) : !gatePassed ? (
        <Panel>
          <PanelHeader
            title="Langkah 1 — Gerbang wajib"
            description="Tiga pemeriksaan pass/fail sebelum skoring dibuka."
          />
          <PanelBody>
            <GateForm
              batchId={batch.id}
              nonB3Extra={batch.material_categories?.non_b3_extra}
            />
          </PanelBody>
        </Panel>
      ) : batch.material_form_profiles && batch.claimed_spec_detail ? (
        <GradingWizard
          batchId={batch.id}
          category={category}
          profile={batch.material_form_profiles}
          claimedSpecDetail={batch.claimed_spec_detail}
          gradeMeanings={batch.material_categories?.grade_meanings ?? null}
          odorLevel3Hint={batch.material_categories?.odor_level3_hint ?? null}
          claimedWeightKg={Number(batch.claimed_weight_kg)}
          documentationDefaults={{
            hasProductionDate: Boolean(batch.production_date),
            hasMultiAnglePhotos: false,
            hasLotNumber: Boolean(batch.lot_number),
            hasLabTest: false,
          }}
          photoActions={{
            top: attachSamplePhotoAction.bind(null, batch.id, "top"),
            middle: attachSamplePhotoAction.bind(null, batch.id, "middle"),
            bottom: attachSamplePhotoAction.bind(null, batch.id, "bottom"),
          }}
        />
      ) : (
        <p role="alert" className="text-danger">
          {ERRORS.profileRequired}
        </p>
      )}
    </div>
  );
}
