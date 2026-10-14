import Link from "next/link";
import {
  ConsistencyNote,
  FinalScoreBreakdown,
  SamplePointTable,
} from "@/components/grading-breakdown";
import { GradeMeaningTable } from "@/components/grade-meaning-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GradeStamp } from "@/components/ui/grade";
import { DataRow, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { effectiveStatus } from "@/lib/certificate";
import {
  formatDate,
  formatWeight,
  formatScore,
  formatValidity,
} from "@/lib/format";
import { normalizeBreakdown } from "@/lib/breakdown";
import { BUCKETS, publicObjectUrl } from "@/lib/storage";
import {
  GRADE_DESCRIPTION,
  GRADE_MEANING,
  SAMPLE_POINT_LABELS,
  VERIFY_PAGE,
  PUBLIC_TEXT,
  REVISION_TEXT,
} from "@/lib/text";
import type { PublicCertificate } from "@/lib/types/db";
export function CertificateView({
  certificate,
}: {
  certificate: PublicCertificate;
}) {
  const status = effectiveStatus(certificate.status, certificate.valid_until);
  const breakdown = certificate.breakdown
    ? normalizeBreakdown(certificate.breakdown, certificate.scoring_version)
    : null;

  return (
    <article className="space-y-6">
      {/* Status paling atas: pembeli perlu tahu ini sebelum melihat grade. */}
      <div
        className={
          status === "valid"
            ? "border border-ok bg-ok-soft px-4 py-3"
            : status === "expired"
              ? "border border-warning bg-warning-soft px-4 py-3"
              : "border border-danger bg-danger-soft px-4 py-3"
        }
      >
        <p
          className={`text-lg font-semibold ${
            status === "valid"
              ? "text-ok"
              : status === "expired"
                ? "text-warning"
                : "text-danger"
          }`}
        >
          {status === "valid"
            ? "SERTIFIKAT BERLAKU"
            : status === "expired"
              ? VERIFY_PAGE.expired
              : "SERTIFIKAT TIDAK BERLAKU"}
        </p>
        <p className="mt-1 text-sm text-ink">
          {status === "valid"
            ? `Berlaku sampai ${formatDate(certificate.valid_until)}.`
            : status === "expired"
              ? VERIFY_PAGE.expiredNotice
              : VERIFY_PAGE.revokedNotice}
        </p>
        {certificate.category.certificate_validity_days ? (
          <p className="mt-2 text-sm text-ink">
            {REVISION_TEXT.validity(
              certificate.category.name,
              formatValidity(certificate.category.certificate_validity_days),
            )}
          </p>
        ) : null}
        {status === "revoked" && certificate.revoke_reason ? (
          <p className="mt-2 text-sm text-ink">
            Alasan: {certificate.revoke_reason}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <GradeStamp
          grade={certificate.grade}
          finalScore={certificate.final_score}
        />
        {certificate.category.grade_meanings ? (
          <GradeMeaningTable
            categoryName={certificate.category.name}
            meanings={certificate.category.grade_meanings}
            grade={certificate.grade}
          />
        ) : (
          <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
            {GRADE_DESCRIPTION[certificate.grade]}
          </p>
        )}
      </div>

      <Panel>
        <PanelHeader title="Identitas batch" />
        <PanelBody>
          <dl>
            <DataRow
              label="Nomor sertifikat"
              value={certificate.certificate_code}
              mono
            />
            <DataRow label="Pabrik" value={certificate.factory.legal_name} />
            <DataRow label="Kota" value={certificate.factory.city} />
            <DataRow
              label="Kategori material"
              value={certificate.category.name}
            />
            {certificate.batch.form_profile ? (
              <DataRow
                label={PUBLIC_TEXT.form}
                value={certificate.batch.form_profile.name}
              />
            ) : null}
            {certificate.batch.declared_material_type ? (
              <DataRow
                label={PUBLIC_TEXT.declaredMaterial}
                value={certificate.batch.declared_material_type}
              />
            ) : null}
            <DataRow
              label="Kode batch"
              value={certificate.batch.batch_code}
              mono
            />
            <DataRow
              label="Nomor lot"
              value={certificate.batch.lot_number ?? "—"}
              mono
            />
            <DataRow
              label="Klaim berat"
              value={formatWeight(certificate.batch.claimed_weight_kg)}
              mono
            />
            <DataRow
              label="Klaim spesifikasi"
              value={certificate.batch.claimed_spec ?? "—"}
            />
            <DataRow
              label="Tanggal produksi"
              value={formatDate(certificate.batch.production_date)}
            />
            <DataRow
              label="Tanggal sampling"
              value={formatDate(certificate.sampled_at)}
            />
            <DataRow
              label="Tanggal terbit"
              value={formatDate(certificate.issued_at)}
            />
            <DataRow
              label="Berlaku sampai"
              value={formatDate(certificate.valid_until)}
            />
          </dl>
        </PanelBody>
      </Panel>

      {breakdown ? (
        <>
          <Panel>
            <PanelHeader
              title="Rincian skor"
              description={`Lima kriteria berbobot tetap. Versi rumus ${certificate.scoring_version}.`}
            />
            <PanelBody>
              <FinalScoreBreakdown breakdown={breakdown} />
              <div className="mt-4 flex items-baseline justify-between border-t-2 border-line-strong pt-3">
                <p className="text-sm font-semibold text-ink">Skor akhir</p>
                <p className="font-mono tabular text-lg font-semibold text-ink">
                  {certificate.final_score}
                </p>
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Rincian per titik sampel"
              description="Sampel diambil di tiga titik berbeda dalam satu batch."
            />
            <PanelBody className="space-y-4">
              <SamplePointTable breakdown={breakdown} />
              <ConsistencyNote breakdown={breakdown} />
              {certificate.scoring_version.startsWith("2.") &&
              breakdown.quantity.specMatchPct !== null ? (
                <p className="text-sm leading-relaxed text-ink-muted">
                  {PUBLIC_TEXT.quantitySummary(
                    formatScore(breakdown.quantity.deviationPct),
                    formatScore(breakdown.quantity.weightScore),
                    formatScore(breakdown.quantity.specMatchPct),
                    formatScore(breakdown.quantity.specScore),
                  )}
                </p>
              ) : null}
            </PanelBody>
          </Panel>
        </>
      ) : null}

      {certificate.photos.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Foto batch"
            description="Diambil grader saat sampling."
          />
          <PanelBody>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {certificate.photos.map((photo) => {
                const url = publicObjectUrl(BUCKETS.photos, photo.file_path);
                const label = photo.sample_point
                  ? `Titik ${SAMPLE_POINT_LABELS[photo.sample_point]}`
                  : "Foto batch";
                return (
                  <li key={photo.file_path} className="border border-line">
                    <a href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={label}
                        className="aspect-4/3 w-full object-cover"
                      />
                    </a>
                    <p className="border-t border-line px-2 py-1 text-xs text-ink-muted">
                      {label}
                    </p>
                  </li>
                );
              })}
            </ul>
          </PanelBody>
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader title={PUBLIC_TEXT.whoTitle} />
        <PanelBody className="space-y-3">
          <p className="text-sm leading-relaxed text-ink-muted">
            {PUBLIC_TEXT.whoBody}
          </p>
          <p className="text-sm leading-relaxed text-ink-muted">
            {PUBLIC_TEXT.withoutAccount}
          </p>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title={VERIFY_PAGE.methodTitle} />
        <PanelBody className="space-y-4">
          <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
            {VERIFY_PAGE.method}
          </p>

          <div>
            <h3 className="text-sm font-semibold text-ink">
              {VERIFY_PAGE.notGuaranteedTitle}
            </h3>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-muted">
              {VERIFY_PAGE.notGuaranteed} {PUBLIC_TEXT.noPrice}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">
              {PUBLIC_TEXT.accuracyTitle}
            </h3>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-muted">
              {VERIFY_PAGE.limitation}{" "}
              {certificate.category.claim_boundary ?? ""}{" "}
              {certificate.category.threshold_disclaimer ?? ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Badge tone="brand">Grade {certificate.grade}</Badge>
            <span className="text-sm text-ink-muted">
              {GRADE_MEANING[certificate.grade]} · skor{" "}
              {certificate.final_score} dari 100
            </span>
          </div>
        </PanelBody>
      </Panel>

      {certificate.pdf_path ? (
        <a
          href={publicObjectUrl(BUCKETS.certificates, certificate.pdf_path)}
          target="_blank"
          rel="noreferrer"
        >
          <Button variant="outline">Unduh PDF sertifikat</Button>
        </a>
      ) : null}
      <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-brand">
        <Link
          href="/tentang"
          className="inline-flex min-h-11 items-center underline"
        >
          {PUBLIC_TEXT.aboutLink}
        </Link>
        <Link
          href="/proses-keberatan"
          className="inline-flex min-h-11 items-center underline"
        >
          {PUBLIC_TEXT.objectionNav}
        </Link>
      </nav>
    </article>
  );
}
