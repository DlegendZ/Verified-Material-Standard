import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell";
import { CopyButton } from "@/components/copy-button";
import { FileUploader } from "@/components/file-uploader";
import { BatchStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { GradeStamp } from "@/components/ui/grade";
import { DataRow, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { attachBatchFileAction } from "../../actions";
import { SubmitBatchButton } from "./submit-button";
import { listingSnippet, verificationUrl } from "@/lib/certificate";
import { formatDate, formatWeight } from "@/lib/format";
import { BUCKETS, publicObjectUrl } from "@/lib/storage";
import { createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import { BATCH_STATUS_HINT } from "@/lib/text";
import type {
  BatchDocumentRow,
  BatchPhotoRow,
  BatchRow,
  CertificateRow,
  GradingResultRow,
} from "@/lib/types/db";

export const metadata = { title: "Detail batch" };

interface BatchDetail extends BatchRow {
  material_categories: { name: string; code: string } | null;
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
    .select("*, material_categories(name, code), factories(owner_id, legal_name)")
    .eq("id", id)
    .maybeSingle<BatchDetail>();

  if (!batch || batch.factories?.owner_id !== user.id) notFound();

  const [{ data: photos }, { data: documents }, { data: grading }, { data: certificate }] =
    await Promise.all([
      supabase.from("batch_photos").select("*").eq("batch_id", id).returns<BatchPhotoRow[]>(),
      supabase.from("batch_documents").select("*").eq("batch_id", id).returns<BatchDocumentRow[]>(),
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

  const isDraft = batch.status === "draft";
  const generalPhotos = (photos ?? []).filter((photo) => photo.sample_point === null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={batch.batch_code}
        description={BATCH_STATUS_HINT[batch.status]}
        action={<BatchStatusBadge status={batch.status} />}
      />

      {certificate && grading ? (
        <Panel>
          <PanelHeader
            title="Sertifikat"
            description="Tempel link atau QR ini di deskripsi listing marketplace."
          />
          <PanelBody className="space-y-5">
            <GradeStamp grade={grading.grade} finalScore={grading.final_score} />

            <dl>
              <DataRow label="Nomor sertifikat" value={certificate.certificate_code} mono />
              <DataRow label="Terbit" value={formatDate(certificate.issued_at)} />
              <DataRow label="Berlaku sampai" value={formatDate(certificate.valid_until)} />
            </dl>

            <div className="flex flex-wrap gap-2">
              <Link href={`/verify/${certificate.certificate_code}`} target="_blank">
                <Button variant="outline" size="sm">
                  Buka halaman verifikasi
                </Button>
              </Link>
              {certificate.pdf_path ? (
                <a
                  href={publicObjectUrl(BUCKETS.certificates, certificate.pdf_path)}
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
                  href={publicObjectUrl(BUCKETS.certificates, certificate.qr_path)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" size="sm">
                    Unduh QR code
                  </Button>
                </a>
              ) : null}
              <CopyButton value={verificationUrl(certificate.certificate_code)} label="Salin link" />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-ink">Teks siap-tempel</p>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap border border-line bg-surface-sunken p-3 text-sm text-ink">
                {listingSnippet({
                  grade: grading.grade,
                  finalScore: grading.final_score,
                  certificateCode: certificate.certificate_code,
                  categoryName: batch.material_categories?.name ?? "—",
                  validUntil: certificate.valid_until,
                })}
              </pre>
              <div className="mt-2">
                <CopyButton
                  variant="primary"
                  label="Salin teks siap-tempel"
                  value={listingSnippet({
                    grade: grading.grade,
                    finalScore: grading.final_score,
                    certificateCode: certificate.certificate_code,
                    categoryName: batch.material_categories?.name ?? "—",
                    validUntil: certificate.valid_until,
                  })}
                />
              </div>
            </div>
          </PanelBody>
        </Panel>
      ) : null}

      {batch.status === "not_certified" && grading ? (
        <Panel className="border-danger">
          <PanelHeader
            title="Tidak lolos sertifikasi"
            description="Skor akhir di bawah 55. Sertifikat tidak diterbitkan."
          />
          <PanelBody>
            <GradeStamp grade={grading.grade} finalScore={grading.final_score} />
            <p className="mt-4 text-sm text-ink-muted">
              Saran: sortir ulang batch untuk memisahkan bagian yang menurunkan skor, lalu ajukan
              batch baru.
            </p>
          </PanelBody>
        </Panel>
      ) : null}

      {batch.status === "rejected_gate" ? (
        <Panel className="border-danger">
          <PanelHeader
            title="Ditolak di gerbang wajib"
            description="Proses berhenti sebelum penilaian. Tidak ada skor dan tidak ada sertifikat."
          />
          <PanelBody>
            <p className="text-sm text-ink-muted">
              Hubungi Admin VMS untuk tahu gate mana yang gagal dan apa yang perlu diperbaiki
              sebelum mengajukan batch baru.
            </p>
          </PanelBody>
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader title="Data batch" />
        <PanelBody>
          <dl>
            <DataRow label="Kategori material" value={batch.material_categories?.name ?? "—"} />
            <DataRow label="Klaim berat" value={formatWeight(batch.claimed_weight_kg)} mono />
            <DataRow label="Klaim spesifikasi" value={batch.claimed_spec ?? "—"} />
            <DataRow label="Tanggal produksi" value={formatDate(batch.production_date)} />
            <DataRow label="Nomor lot" value={batch.lot_number ?? "—"} mono />
            <DataRow label="Dibuat" value={formatDate(batch.created_at)} />
          </dl>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title="Foto batch"
          description="Foto multi-sudut menambah 25 poin pada kelengkapan dokumentasi."
        />
        <PanelBody className="space-y-4">
          {generalPhotos.length === 0 ? (
            <p className="text-sm text-ink-muted">Belum ada foto.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {generalPhotos.map((photo) => (
                <li key={photo.id} className="border border-line bg-surface-sunken">
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
              label="Unggah foto batch"
              accept="image/*"
              onUploaded={attachBatchFileAction.bind(null, batch.id, "photo")}
            />
          ) : null}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title="Dokumen"
          description="Dokumen asal-usul wajib ada agar batch lolos gerbang wajib. Hasil uji lab menambah 25 poin dokumentasi."
        />
        <PanelBody className="space-y-4">
          {(documents ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">Belum ada dokumen.</p>
          ) : (
            <ul className="space-y-2">
              {(documents ?? []).map((document) => (
                <li
                  key={document.id}
                  className="flex items-center justify-between gap-3 border border-line px-3 py-2 text-sm"
                >
                  <span className="text-ink">
                    {document.kind === "origin_doc"
                      ? "Dokumen asal-usul"
                      : document.kind === "lab_test"
                        ? "Hasil uji lab"
                        : "Dokumen lain"}
                  </span>
                  <span className="text-ink-muted">{formatDate(document.uploaded_at)}</span>
                </li>
              ))}
            </ul>
          )}
          {isDraft ? (
            <div className="flex flex-wrap gap-3">
              <FileUploader
                batchId={batch.id}
                bucket={BUCKETS.documents}
                label="Unggah dokumen asal-usul"
                accept="image/*,application/pdf"
                onUploaded={attachBatchFileAction.bind(null, batch.id, "origin_doc")}
              />
              <FileUploader
                batchId={batch.id}
                bucket={BUCKETS.documents}
                label="Unggah hasil uji lab"
                accept="image/*,application/pdf"
                onUploaded={attachBatchFileAction.bind(null, batch.id, "lab_test")}
              />
            </div>
          ) : null}
        </PanelBody>
      </Panel>

      {isDraft ? (
        <Panel>
          <PanelHeader
            title="Ajukan batch"
            description="Setelah diajukan, data dan berkas batch dikunci supaya penilaian tetap bisa diaudit."
          />
          <PanelBody>
            <SubmitBatchButton batchId={batch.id} />
          </PanelBody>
        </Panel>
      ) : null}
    </div>
  );
}
