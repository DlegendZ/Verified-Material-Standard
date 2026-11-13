import type { Locale } from "@/lib/locale";
import {
  categoryName,
  profileName,
  gradeNamesEn,
  gradeDescriptionsEn,
  woodGradesEn,
} from "@/lib/public-english";
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
  locale = "id",
}: {
  certificate: PublicCertificate;
  locale?: Locale;
}) {
  const en = locale === "en";
  const name = categoryName(
    locale,
    certificate.category.code,
    certificate.category.name,
  );
  const solidWood = certificate.category.code === "solid_wood";
  const gradeNames = en ? gradeNamesEn : GRADE_MEANING;
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
            ? en
              ? "CERTIFICATE VALID"
              : "SERTIFIKAT BERLAKU"
            : status === "expired"
              ? en
                ? "EXPIRED"
                : VERIFY_PAGE.expired
              : en
                ? "CERTIFICATE NOT VALID"
                : "SERTIFIKAT TIDAK BERLAKU"}
        </p>
        <p className="mt-1 text-sm text-ink">
          {status === "valid"
            ? `${en ? "Valid until" : "Berlaku sampai"} ${formatDate(certificate.valid_until, locale)}.`
            : status === "expired"
              ? en
                ? "This certificate has expired. Check with the seller for a current assessment."
                : VERIFY_PAGE.expiredNotice
              : en
                ? "This certificate is no longer valid. Do not rely on it for this batch."
                : VERIFY_PAGE.revokedNotice}
        </p>
        {certificate.category.certificate_validity_days ? (
          <p className="mt-2 text-sm text-ink">
            {en
              ? `${name} certificates are valid for ${formatValidity(certificate.category.certificate_validity_days, locale)} from issue.`
              : REVISION_TEXT.validity(
                  certificate.category.name,
                  formatValidity(
                    certificate.category.certificate_validity_days,
                  ),
                )}
          </p>
        ) : null}
        {status === "revoked" && certificate.revoke_reason ? (
          <p className="mt-2 text-sm text-ink">
            {en ? "Reason" : "Alasan"}: {certificate.revoke_reason}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <GradeStamp
          grade={certificate.grade}
          finalScore={certificate.final_score}
          locale={locale}
        />
        {certificate.category.grade_meanings ? (
          <GradeMeaningTable
            categoryName={name}
            locale={locale}
            meanings={
              en && solidWood
                ? woodGradesEn
                : certificate.category.grade_meanings
            }
            grade={certificate.grade}
          />
        ) : (
          <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
            {(en ? gradeDescriptionsEn : GRADE_DESCRIPTION)[certificate.grade]}
          </p>
        )}
      </div>

      <Panel>
        <PanelHeader title={en ? "Batch details" : "Identitas batch"} />
        <PanelBody>
          <dl>
            <DataRow
              label={en ? "Certificate number" : "Nomor sertifikat"}
              value={certificate.certificate_code}
              mono
            />
            <DataRow
              label={en ? "Factory" : "Pabrik"}
              value={certificate.factory.legal_name}
            />
            <DataRow
              label={en ? "City" : "Kota"}
              value={certificate.factory.city}
            />
            <DataRow
              label={en ? "Material category" : "Kategori material"}
              value={name}
            />
            {certificate.batch.form_profile ? (
              <DataRow
                label={en ? "Material form" : PUBLIC_TEXT.form}
                value={profileName(
                  locale,
                  certificate.batch.form_profile.code,
                  certificate.batch.form_profile.name,
                )}
              />
            ) : null}
            {certificate.batch.declared_material_type ? (
              <DataRow
                label={
                  en ? "Declared material type" : PUBLIC_TEXT.declaredMaterial
                }
                value={certificate.batch.declared_material_type}
              />
            ) : null}
            <DataRow
              label={en ? "Batch code" : "Kode batch"}
              value={certificate.batch.batch_code}
              mono
            />
            <DataRow
              label={en ? "Lot number" : "Nomor lot"}
              value={certificate.batch.lot_number ?? "—"}
              mono
            />
            <DataRow
              label={en ? "Declared weight" : "Klaim berat"}
              value={formatWeight(certificate.batch.claimed_weight_kg, locale)}
              mono
            />
            <DataRow
              label={en ? "Declared specifications" : "Klaim spesifikasi"}
              value={certificate.batch.claimed_spec ?? "—"}
            />
            <DataRow
              label={en ? "Production date" : "Tanggal produksi"}
              value={formatDate(certificate.batch.production_date, locale)}
            />
            <DataRow
              label={en ? "Sampling date" : "Tanggal sampling"}
              value={formatDate(certificate.sampled_at, locale)}
            />
            <DataRow
              label={en ? "Issue date" : "Tanggal terbit"}
              value={formatDate(certificate.issued_at, locale)}
            />
            <DataRow
              label={en ? "Valid until" : "Berlaku sampai"}
              value={formatDate(certificate.valid_until, locale)}
            />
          </dl>
        </PanelBody>
      </Panel>

      {breakdown ? (
        <>
          <Panel>
            <PanelHeader
              title={en ? "Score breakdown" : "Rincian skor"}
              description={
                en
                  ? `Five weighted criteria. Scoring version ${certificate.scoring_version}.`
                  : `Lima kriteria berbobot tetap. Versi rumus ${certificate.scoring_version}.`
              }
            />
            <PanelBody>
              <FinalScoreBreakdown breakdown={breakdown} locale={locale} />
              <div className="mt-4 flex items-baseline justify-between border-t-2 border-line-strong pt-3">
                <p className="text-sm font-semibold text-ink">
                  {en ? "Final score" : "Skor akhir"}
                </p>
                <p className="font-mono tabular text-lg font-semibold text-ink">
                  {certificate.final_score}
                </p>
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title={en ? "Scores by sample point" : "Rincian per titik sampel"}
              description={
                en
                  ? "Samples came from three points in the same batch."
                  : "Sampel diambil di tiga titik berbeda dalam satu batch."
              }
            />
            <PanelBody className="space-y-4">
              <SamplePointTable breakdown={breakdown} locale={locale} />
              <ConsistencyNote breakdown={breakdown} locale={locale} />
              {certificate.scoring_version.startsWith("2.") &&
              breakdown.quantity.specMatchPct !== null ? (
                <p className="text-sm leading-relaxed text-ink-muted">
                  {en
                    ? `Largest quantity difference: ${formatScore(breakdown.quantity.deviationPct, locale)}% (score ${formatScore(breakdown.quantity.weightScore, locale)}). ${formatScore(breakdown.quantity.specMatchPct, locale)}% of units were within dimension tolerance (score ${formatScore(breakdown.quantity.specScore, locale)}).`
                    : PUBLIC_TEXT.quantitySummary(
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
            title={en ? "Batch photos" : "Foto batch"}
            description={
              en ? "Taken during sampling." : "Diambil grader saat sampling."
            }
          />
          <PanelBody>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {certificate.photos.map((photo) => {
                const url = publicObjectUrl(BUCKETS.photos, photo.file_path);
                const label = photo.sample_point
                  ? en
                    ? { top: "Top", middle: "Middle", bottom: "Bottom" }[
                        photo.sample_point
                      ]
                    : `Titik ${SAMPLE_POINT_LABELS[photo.sample_point]}`
                  : en
                    ? "Batch photo"
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
        <PanelHeader
          title={en ? "Who assesses the material" : PUBLIC_TEXT.whoTitle}
        />
        <PanelBody className="space-y-3">
          <p className="text-sm leading-relaxed text-ink-muted">
            {en
              ? "A VMS grader samples three points and scores them. A VMS administrator reviews the result and issues the certificate."
              : PUBLIC_TEXT.whoBody}
          </p>
          <p className="text-sm leading-relaxed text-ink-muted">
            {en
              ? "Anyone with the link or QR code can check this certificate without an account."
              : PUBLIC_TEXT.withoutAccount}
          </p>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title={en ? "How we assess batches" : VERIFY_PAGE.methodTitle}
        />
        <PanelBody className="space-y-4">
          <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
            {en
              ? "A grader examines samples from the top, middle, and bottom of the stack. The score describes the batch at sampling time."
              : VERIFY_PAGE.method}
          </p>

          <div>
            <h3 className="text-sm font-semibold text-ink">
              {en
                ? "What the certificate does not guarantee"
                : VERIFY_PAGE.notGuaranteedTitle}
            </h3>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-muted">
              {en
                ? "The grade does not certify every unit, set a price, or guarantee suitability for a particular use."
                : `${VERIFY_PAGE.notGuaranteed} ${PUBLIC_TEXT.noPrice}`}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">
              {en ? "Assessment limits" : PUBLIC_TEXT.accuracyTitle}
            </h3>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-muted">
              {en
                ? solidWood
                  ? "Three samples are not a full inspection. Solid wood grades describe condition and declared specifications. They do not test structural strength. Defect thresholds and dimension tolerances are preliminary and await expert validation."
                  : "Three samples are not a full inspection."
                : [
                    VERIFY_PAGE.limitation,
                    certificate.category.claim_boundary,
                    certificate.category.threshold_disclaimer,
                  ]
                    .filter(Boolean)
                    .join(" ")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Badge tone="brand">Grade {certificate.grade}</Badge>
            <span className="text-sm text-ink-muted">
              {gradeNames[certificate.grade]} ·{" "}
              {en
                ? `score ${certificate.final_score} out of 100`
                : `skor ${certificate.final_score} dari 100`}
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
          <Button variant="outline">
            {en ? "Download certificate PDF" : "Unduh PDF sertifikat"}
          </Button>
        </a>
      ) : null}
      <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-brand">
        <Link
          href="/tentang"
          className="inline-flex min-h-11 items-center underline"
        >
          {en ? "How it works & FAQ" : PUBLIC_TEXT.aboutLink}
        </Link>
        <Link
          href="/proses-keberatan"
          className="inline-flex min-h-11 items-center underline"
        >
          {en ? "Appeals process" : PUBLIC_TEXT.objectionNav}
        </Link>
      </nav>
    </article>
  );
}
