import type { Metadata } from "next";
import Link from "next/link";
import { ConsistencyNote, FinalScoreBreakdown, SamplePointTable } from "@/components/grading-breakdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { VerifyCodeForm } from "@/components/verify-code-form";
import { Wordmark } from "@/components/wordmark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GradeStamp } from "@/components/ui/grade";
import { DataRow, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { effectiveStatus } from "@/lib/certificate";
import { formatDate, formatWeight } from "@/lib/format";
import type { GradingResult } from "@/lib/scoring";
import { BUCKETS, publicObjectUrl } from "@/lib/storage";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { APP, GRADE_DESCRIPTION, GRADE_MEANING, SAMPLE_POINT_LABELS, VERIFY_PAGE } from "@/lib/text";
import type { PublicCertificate } from "@/lib/types/db";

/**
 * Halaman verifikasi publik — wajah produk ke pembeli.
 *
 * Dibuka tanpa login, sering dari scan QR di HP dengan koneksi seadanya, jadi
 * di-render statis dan divalidasi ulang berkala (SRD Bab 11: < 1,5 detik di 4G).
 */
export const revalidate = 60;

async function loadCertificate(code: string): Promise<PublicCertificate | null> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc("public_certificate", { p_code: code });
    if (error || !data) return null;
    return data as PublicCertificate;
  } catch {
    // Env belum lengkap saat build/preview: perlakukan seperti tidak ditemukan.
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const certificate = await loadCertificate(code);

  if (!certificate) {
    return { title: VERIFY_PAGE.notFoundTitle, robots: { index: false } };
  }

  const title = `Grade ${certificate.grade} — ${certificate.factory.legal_name}`;
  const description = `${certificate.category.name}, ${certificate.batch.claimed_weight_kg} kg. Skor ${certificate.final_score}/100. Sertifikat ${certificate.certificate_code} diverifikasi ${APP.longName}.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
  };
}

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const certificate = await loadCertificate(code);

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="rounded-[2px]">
            <Wordmark />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        {certificate ? (
          <CertificateView certificate={certificate} />
        ) : (
          <NotFoundView code={code} />
        )}
      </main>

      <footer className="mx-auto w-full max-w-3xl px-4 pb-10 sm:px-6">
        <p className="border-t border-line pt-4 text-xs text-ink-muted">
          {APP.longName} · {APP.demoNotice}
        </p>
      </footer>
    </div>
  );
}

function NotFoundView({ code }: { code: string }) {
  return (
    <div className="space-y-6">
      <div className="border border-danger bg-danger-soft px-5 py-6">
        <h1 className="text-xl font-semibold text-danger">{VERIFY_PAGE.notFoundTitle}</h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink">
          {VERIFY_PAGE.notFoundBody}
        </p>
        <p className="mt-3 font-mono text-sm text-ink-muted">Kode yang dicari: {code}</p>
      </div>

      <Panel>
        <PanelHeader title="Coba kode lain" />
        <PanelBody>
          <VerifyCodeForm autoFocus />
        </PanelBody>
      </Panel>

      <Link href="/">
        <Button variant="outline">Pelajari cara kerja VMS</Button>
      </Link>
    </div>
  );
}

function CertificateView({ certificate }: { certificate: PublicCertificate }) {
  const status = effectiveStatus(certificate.status, certificate.valid_until);
  const breakdown = certificate.breakdown as GradingResult["breakdown"] | null;

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
            status === "valid" ? "text-ok" : status === "expired" ? "text-warning" : "text-danger"
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
        {status === "revoked" && certificate.revoke_reason ? (
          <p className="mt-2 text-sm text-ink">Alasan: {certificate.revoke_reason}</p>
        ) : null}
      </div>

      <div className="space-y-3">
        <GradeStamp grade={certificate.grade} finalScore={certificate.final_score} />
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          {GRADE_DESCRIPTION[certificate.grade]}
        </p>
      </div>

      <Panel>
        <PanelHeader title="Identitas batch" />
        <PanelBody>
          <dl>
            <DataRow label="Nomor sertifikat" value={certificate.certificate_code} mono />
            <DataRow label="Pabrik" value={certificate.factory.legal_name} />
            <DataRow label="Kota" value={certificate.factory.city} />
            <DataRow label="Kategori material" value={certificate.category.name} />
            <DataRow label="Kode batch" value={certificate.batch.batch_code} mono />
            <DataRow label="Nomor lot" value={certificate.batch.lot_number ?? "—"} mono />
            <DataRow label="Klaim berat" value={formatWeight(certificate.batch.claimed_weight_kg)} mono />
            <DataRow label="Klaim spesifikasi" value={certificate.batch.claimed_spec ?? "—"} />
            <DataRow label="Tanggal produksi" value={formatDate(certificate.batch.production_date)} />
            <DataRow label="Tanggal sampling" value={formatDate(certificate.sampled_at)} />
            <DataRow label="Tanggal terbit" value={formatDate(certificate.issued_at)} />
            <DataRow label="Berlaku sampai" value={formatDate(certificate.valid_until)} />
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
            </PanelBody>
          </Panel>
        </>
      ) : null}

      {certificate.photos.length > 0 ? (
        <Panel>
          <PanelHeader title="Foto batch" description="Diambil grader saat sampling." />
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
                      <img src={url} alt={label} className="aspect-4/3 w-full object-cover" />
                    </a>
                    <p className="border-t border-line px-2 py-1 text-xs text-ink-muted">{label}</p>
                  </li>
                );
              })}
            </ul>
          </PanelBody>
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader title={VERIFY_PAGE.methodTitle} />
        <PanelBody className="space-y-4">
          <p className="max-w-prose text-sm leading-relaxed text-ink-muted">{VERIFY_PAGE.method}</p>

          <div>
            <h3 className="text-sm font-semibold text-ink">{VERIFY_PAGE.notGuaranteedTitle}</h3>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-muted">
              {VERIFY_PAGE.notGuaranteed}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">{VERIFY_PAGE.limitationTitle}</h3>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-muted">
              {VERIFY_PAGE.limitation}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Badge tone="brand">Grade {certificate.grade}</Badge>
            <span className="text-sm text-ink-muted">
              {GRADE_MEANING[certificate.grade]} · skor {certificate.final_score} dari 100
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
    </article>
  );
}
