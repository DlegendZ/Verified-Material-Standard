import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell";
import { CopyButton } from "@/components/copy-button";
import { BatchDocuments } from "@/components/batch-documents";
import { categoryName, profileName, woodGradesEn } from "@/lib/public-english";
import { claimedSpecSummary } from "@/lib/claims";
import { getLocale } from "@/lib/locale-server";
import { DeleteDraftButton } from "./delete-draft-button";
import { FileUploader } from "@/components/file-uploader";
import { BatchStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GradeStamp } from "@/components/ui/grade";
import { GradeMeaningTable } from "@/components/grade-meaning-table";
import { DataRow, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { attachBatchFileAction } from "../../actions";
import { SubmitBatchButton } from "./submit-button";
import {
  listingSnippet,
  verificationUrl,
  effectiveStatus,
} from "@/lib/certificate";
import { formatDate, formatWeight, formatValidity } from "@/lib/format";
import { BUCKETS, publicObjectUrl } from "@/lib/storage";
import { createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import {
  BATCH_STATUS_HINT,
  BATCH_FORM_TEXT,
  CLAIM_TEXT,
  REVISION_TEXT,
  EFFECTIVE_CERTIFICATE_LABELS,
  VERIFY_PAGE,
} from "@/lib/text";
import type {
  BatchPhotoRow,
  BatchRow,
  CertificateRow,
  GradingResultRow,
  MaterialCategoryRow,
  MaterialFormProfileRow,
} from "@/lib/types/db";

export const metadata = { title: "Detail batch" };

interface BatchDetail extends BatchRow {
  material_categories: MaterialCategoryRow | null;
  material_form_profiles: MaterialFormProfileRow | null;
  factories: { owner_id: string; legal_name: string } | null;
}

export default async function FactoryBatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("factory");
  const supabase = await createSupabaseServerClient();

  const { data: batch } = await supabase
    .from("batches")
    .select(
      "*, material_categories(*), material_form_profiles(*), factories(owner_id, legal_name)",
    )
    .eq("id", id)
    .maybeSingle<BatchDetail>();

  if (!batch || batch.factories?.owner_id !== user.id) notFound();

  const [{ data: photos }, { data: grading }, { data: certificate }] =
    await Promise.all([
      supabase
        .from("batch_photos")
        .select("*")
        .eq("batch_id", id)
        .returns<BatchPhotoRow[]>(),
      supabase
        .from("grading_results")
        .select("*")
        .eq("batch_id", id)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle<GradingResultRow>(),
      supabase
        .from("certificates")
        .select("*")
        .eq("batch_id", id)
        .order("issued_at", { ascending: false })
        .limit(1)
        .maybeSingle<CertificateRow>(),
    ]);

  const locale = await getLocale();
  const en = locale === "en";
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
  const isDraft = batch.status === "draft";
  const generalPhotos = (photos ?? []).filter(
    (photo) => photo.sample_point === null,
  );
  const certificateStatus = certificate
    ? effectiveStatus(certificate.status, certificate.valid_until)
    : null;
  const validityNote = batch.material_categories?.certificate_validity_days
    ? REVISION_TEXT.validity(
        batch.material_categories.name,
        formatValidity(batch.material_categories.certificate_validity_days),
      )
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={batch.batch_code}
        description={
          en
            ? isDraft
              ? "Upload supporting files, then submit the draft to VMS."
              : undefined
            : BATCH_STATUS_HINT[batch.status]
        }
        action={<BatchStatusBadge status={batch.status} locale={locale} />}
      />

      {certificate && grading ? (
        <Panel>
          <PanelHeader
            title={en ? "Certificate" : "Sertifikat"}
            description={
              en
                ? "Paste this link or QR code into the marketplace listing."
                : "Tempel link atau QR ini di deskripsi listing marketplace."
            }
            action={
              certificateStatus ? (
                <Badge tone={certificateStatus === "valid" ? "ok" : "danger"}>
                  {en
                    ? {
                        valid: "VALID",
                        expired: "EXPIRED",
                        revoked: "NOT VALID",
                      }[certificateStatus]
                    : EFFECTIVE_CERTIFICATE_LABELS[certificateStatus]}
                </Badge>
              ) : null
            }
          />
          <PanelBody className="space-y-5">
            <GradeStamp
              grade={grading.grade}
              finalScore={grading.final_score}
              locale={locale}
            />
            {certificateStatus !== "valid" ? (
              <p
                role="status"
                className="rounded-xl bg-danger-soft p-3 text-sm text-danger"
              >
                {certificateStatus === "revoked"
                  ? VERIFY_PAGE.revokedNotice
                  : VERIFY_PAGE.expiredNotice}
              </p>
            ) : null}
            {validityNote ? (
              <p className="text-sm text-ink-muted">{validityNote}</p>
            ) : null}
            <Link
              href="/proses-keberatan"
              className="block text-sm font-medium text-brand underline"
            >
              {en
                ? "Disagree with the grade? See the appeals process."
                : REVISION_TEXT.objectionLink}
            </Link>

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
            </dl>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/verify/${certificate.certificate_code}`}
                target="_blank"
              >
                <Button variant="outline" size="sm">
                  Buka halaman verifikasi
                </Button>
              </Link>
              {certificate.pdf_path ? (
                <a
                  href={publicObjectUrl(
                    BUCKETS.certificates,
                    certificate.pdf_path,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" size="sm">
                    Unduh PDF sertifikat
                  </Button>
                </a>
              ) : null}
              {certificate.qr_path ? (
                <a
                  href={publicObjectUrl(
                    BUCKETS.certificates,
                    certificate.qr_path,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" size="sm">
                    Unduh QR code
                  </Button>
                </a>
              ) : null}
              <CopyButton
                value={verificationUrl(certificate.certificate_code)}
                label={en ? "Copy link" : "Salin link"}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-ink">
                {en ? "Listing text" : "Teks siap-tempel"}
              </p>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap border border-line bg-surface-sunken p-3 text-sm text-ink">
                {listingSnippet({
                  grade: grading.grade,
                  finalScore: grading.final_score,
                  certificateCode: certificate.certificate_code,
                  categoryName: batch.material_categories?.name ?? "—",
                  validUntil: certificate.valid_until,
                  formProfileName: batch.material_form_profiles?.name,
                })}
              </pre>
              <div className="mt-2">
                <CopyButton
                  variant="primary"
                  label={en ? "Copy listing text" : "Salin teks siap-tempel"}
                  value={listingSnippet({
                    grade: grading.grade,
                    finalScore: grading.final_score,
                    certificateCode: certificate.certificate_code,
                    categoryName: batch.material_categories?.name ?? "—",
                    validUntil: certificate.valid_until,
                    formProfileName: batch.material_form_profiles?.name,
                  })}
                />
              </div>
            </div>
          </PanelBody>
        </Panel>
      ) : null}

      {grading && batch.material_categories?.grade_meanings ? (
        <Panel>
          <PanelBody>
            <GradeMeaningTable
              categoryName={materialLabel}
              locale={locale}
              meanings={
                en && category?.code === "solid_wood"
                  ? woodGradesEn
                  : batch.material_categories.grade_meanings
              }
              grade={grading.grade}
            />
          </PanelBody>
        </Panel>
      ) : null}

      {batch.status === "not_certified" && grading ? (
        <Panel className="border-danger">
          <PanelHeader
            title={en ? "Not certified" : "Tidak lolos sertifikasi"}
            description={
              en
                ? "The score was below 55. No certificate was issued."
                : "Skor akhir di bawah 55. Sertifikat tidak diterbitkan."
            }
          />
          <PanelBody>
            <GradeStamp
              grade={grading.grade}
              finalScore={grading.final_score}
              locale={locale}
            />
            <p className="mt-4 text-sm text-ink-muted">
              Saran: sortir ulang batch untuk memisahkan bagian yang menurunkan
              skor, lalu ajukan batch baru.
            </p>
          </PanelBody>
        </Panel>
      ) : null}

      {batch.status === "rejected_gate" ? (
        <Panel className="border-danger">
          <PanelHeader
            title={en ? "Rejected at the gate" : "Ditolak di gerbang wajib"}
            description={
              en
                ? "The assessment stopped. No score or certificate was issued."
                : "Proses berhenti sebelum penilaian. Tidak ada skor dan tidak ada sertifikat."
            }
          />
          <PanelBody>
            <p className="text-sm text-ink-muted">
              Hubungi Admin VMS untuk tahu gate mana yang gagal dan apa yang
              perlu diperbaiki sebelum mengajukan batch baru.
            </p>
          </PanelBody>
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader title={en ? "Batch details" : BATCH_FORM_TEXT.dataTitle} />
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
              label={en ? "Production date" : "Tanggal produksi"}
              value={formatDate(batch.production_date, locale)}
            />
            <DataRow
              label={en ? "Lot number" : "Nomor lot"}
              value={batch.lot_number ?? "—"}
              mono
            />
            <DataRow
              label={en ? "Created" : "Dibuat"}
              value={formatDate(batch.created_at, locale)}
            />
          </dl>
          {batch.intake_declarations ? (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold text-ink">
                {BATCH_FORM_TEXT.declarations}
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
                  {REVISION_TEXT.declarations[key]}
                </p>
              ))}
            </div>
          ) : null}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title={en ? "Batch photos" : "Foto batch"}
          description={
            en
              ? "Multi-angle photos add 25 documentation points."
              : "Foto multi-sudut menambah 25 poin pada kelengkapan dokumentasi."
          }
        />
        <PanelBody className="space-y-4">
          {generalPhotos.length === 0 ? (
            <p className="text-sm text-ink-muted">
              {en ? "No photos yet." : "Belum ada foto."}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {generalPhotos.map((photo) => (
                <li
                  key={photo.id}
                  className="border border-line bg-surface-sunken"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicObjectUrl(BUCKETS.photos, photo.file_path)}
                    alt={photo.angle_label ?? "Foto batch"}
                    className="aspect-4/3 w-full object-cover"
                  />
                </li>
              ))}
            </ul>
          )}
          {isDraft ? (
            <FileUploader
              batchId={batch.id}
              bucket={BUCKETS.photos}
              label={en ? "Upload batch photo" : "Unggah foto batch"}
              onUploaded={attachBatchFileAction.bind(null, batch.id, "photo")}
            />
          ) : null}
        </PanelBody>
      </Panel>

      <BatchDocuments supabase={supabase} batchId={batch.id}>
        {isDraft && (
          <>
            <p className="text-sm text-ink-muted">
              {en ? "Upload a PDF or an image." : "Unggah PDF atau gambar."}
            </p>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  [
                    "origin_doc",
                    en ? "Upload proof of origin" : "Unggah dokumen asal-usul",
                  ],
                  [
                    "lab_test",
                    en ? "Upload lab test results" : "Unggah hasil uji lab",
                  ],
                  [
                    "other",
                    en ? "Upload other document" : "Unggah dokumen lain",
                  ],
                ] as const
              ).map(([kind, label]) => (
                <FileUploader
                  key={kind}
                  batchId={batch.id}
                  bucket={BUCKETS.documents}
                  label={label}
                  onUploaded={attachBatchFileAction.bind(null, batch.id, kind)}
                />
              ))}
            </div>
          </>
        )}
      </BatchDocuments>

      {isDraft ? (
        <Panel>
          <PanelHeader
            title={en ? "Submit the batch" : "Ajukan batch"}
            description={
              en
                ? "Submitting locks batch details and attachments for audit."
                : "Setelah diajukan, data dan berkas batch dikunci supaya penilaian tetap bisa diaudit."
            }
          />
          <PanelBody>
            <SubmitBatchButton batchId={batch.id} />
            <div className="mt-5 border-t border-line pt-4">
              <DeleteDraftButton
                batchId={batch.id}
                batchCode={batch.batch_code}
                en={en}
              />
            </div>
          </PanelBody>
        </Panel>
      ) : null}
    </div>
  );
}
