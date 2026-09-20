import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GradeChip } from "@/components/ui/grade";
import { DataRow, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { RevokeForm } from "./revoke-form";
import { effectiveStatus } from "@/lib/certificate";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import { CERTIFICATE_STATUS_LABELS, EMPTY_STATES, VERIFY_PAGE } from "@/lib/text";
import type { CertificateRow, GradeDb } from "@/lib/types/db";

export const metadata = { title: "Sertifikat" };

interface CertificateListRow extends CertificateRow {
  batches: { batch_code: string; factories: { legal_name: string } | null } | null;
  grading_results: { grade: GradeDb; final_score: number } | null;
}

export default async function AdminCertificatesPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const { data: certificates } = await supabase
    .from("certificates")
    .select("*, batches(batch_code, factories(legal_name)), grading_results(grade, final_score)")
    .order("issued_at", { ascending: false })
    .returns<CertificateListRow[]>();

  const list = certificates ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sertifikat"
        description="Sertifikat yang dicabut tetap bisa dibuka publik, tapi halamannya menampilkan status TIDAK BERLAKU."
      />

      {list.length === 0 ? (
        <EmptyState title={EMPTY_STATES.noCertificates} />
      ) : (
        list.map((certificate) => {
          const status = effectiveStatus(certificate.status, certificate.valid_until);
          return (
            <Panel key={certificate.id}>
              <PanelHeader
                title={certificate.certificate_code}
                description={certificate.batches?.factories?.legal_name ?? "—"}
                action={
                  <div className="flex items-center gap-2">
                    {certificate.grading_results ? (
                      <GradeChip grade={certificate.grading_results.grade} />
                    ) : null}
                    <Badge
                      tone={status === "valid" ? "ok" : status === "expired" ? "warning" : "danger"}
                    >
                      {status === "valid"
                        ? CERTIFICATE_STATUS_LABELS.issued
                        : status === "expired"
                          ? VERIFY_PAGE.expired
                          : CERTIFICATE_STATUS_LABELS.revoked}
                    </Badge>
                  </div>
                }
              />
              <PanelBody className="space-y-4">
                <dl>
                  <DataRow label="Kode batch" value={certificate.batches?.batch_code ?? "—"} mono />
                  <DataRow label="Terbit" value={formatDate(certificate.issued_at)} />
                  <DataRow label="Berlaku sampai" value={formatDate(certificate.valid_until)} />
                  {certificate.revoke_reason ? (
                    <DataRow label="Alasan pencabutan" value={certificate.revoke_reason} />
                  ) : null}
                </dl>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/verify/${certificate.certificate_code}`}
                    target="_blank"
                    className="text-sm font-medium text-brand underline underline-offset-4"
                  >
                    Buka halaman verifikasi
                  </Link>
                </div>

                {certificate.status === "issued" ? (
                  <RevokeForm certificateId={certificate.id} />
                ) : null}
              </PanelBody>
            </Panel>
          );
        })
      )}
    </div>
  );
}
