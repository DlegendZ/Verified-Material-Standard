import { categoryName } from "@/lib/public-english";
import { getLocale } from "@/lib/locale-server";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import {
  BatchStatusBadge,
  FactoryStatusBadge,
} from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GradeChip } from "@/components/ui/grade";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { formatDate, formatWeight, daysUntil } from "@/lib/format";
import { createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import { EMPTY_STATES, ERRORS, BATCH_FORM_TEXT } from "@/lib/text";
import type { BatchStatus, FactoryRow, GradeDb } from "@/lib/types/db";

export const metadata = { title: "Dashboard pabrik" };

interface BatchListRow {
  id: string;
  batch_code: string;
  status: BatchStatus;
  claimed_weight_kg: number;
  created_at: string;
  material_categories: { code: string; name: string } | null;
  grading_results: { grade: GradeDb; final_score: number }[];
  certificates: {
    certificate_code: string;
    status: string;
    valid_until: string;
  }[];
}

export default async function FactoryDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const locale = await getLocale();
  const en = locale === "en";
  const { draft } = await searchParams;
  const user = await requireRole("factory");
  const supabase = await createSupabaseServerClient();

  const { data: factory } = await supabase
    .from("factories")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle<FactoryRow>();

  const { data: batches } = factory
    ? await supabase
        .from("batches")
        .select(
          "id, batch_code, status, claimed_weight_kg, created_at, material_categories(code, name), grading_results(grade, final_score), certificates(certificate_code, status, valid_until)",
        )
        .eq("factory_id", factory.id)
        .order("created_at", { ascending: false })
        .returns<BatchListRow[]>()
    : { data: [] as BatchListRow[] };

  const list = batches ?? [];

  return (
    <div className="space-y-6">
      {draft === "deleted" && (
        <p role="status" className="rounded-xl bg-ok-soft p-3 text-sm text-ok">
          {en ? "Draft deleted." : "Draft berhasil dihapus."}
        </p>
      )}
      {draft === "cleanup-pending" && (
        <p
          role="alert"
          className="rounded-xl bg-warning-soft p-3 text-sm text-warning"
        >
          {en
            ? "Draft deleted, but some attachments could not be removed. Contact an administrator."
            : "Draft dihapus, tapi sebagian lampiran belum terhapus. Hubungi Admin."}
        </p>
      )}
      <PageHeader
        title={
          factory
            ? factory.legal_name
            : en
              ? "Factory dashboard"
              : "Dashboard pabrik"
        }
        description={
          factory
            ? `${factory.city} · ${list.length} ${en ? "registered batches" : "batch terdaftar"}`
            : en
              ? "Complete your factory profile to submit a batch."
              : "Lengkapi profil pabrik untuk mulai mengajukan batch."
        }
        action={
          factory ? (
            <Link href="/factory/batches/new">
              <Button>{en ? "Submit a batch" : "Ajukan batch"}</Button>
            </Link>
          ) : null
        }
      />

      {!factory ? (
        <EmptyState
          title={en ? "No factory profile yet" : "Profil pabrik belum diisi"}
          description={
            en
              ? "VMS needs your factory details before it can verify your factory and accept a batch."
              : "Admin VMS perlu data pabrik untuk memverifikasi kamu sebelum batch pertama bisa diajukan."
          }
          action={
            <Link href="/factory/profile">
              <Button>
                {en ? "Complete factory profile" : "Isi profil pabrik"}
              </Button>
            </Link>
          }
        />
      ) : (
        <Panel>
          <PanelHeader
            title={en ? "Factory verification" : "Status verifikasi pabrik"}
            action={
              <FactoryStatusBadge
                status={factory.verification_status}
                locale={locale}
              />
            }
          />
          <PanelBody>
            {factory.verification_status === "verified" ? (
              <p className="text-sm text-ink-muted">
                {en
                  ? `Your factory has been verified since ${formatDate(factory.verified_at, locale)}. You can submit batches now.`
                  : `Pabrik terverifikasi sejak ${formatDate(factory.verified_at)}. Kamu bisa mengajukan batch kapan saja.`}
              </p>
            ) : factory.verification_status === "pending" ? (
              <p className="text-sm text-ink-muted">
                {en
                  ? "Your factory must be verified before submitting a batch."
                  : ERRORS.factoryNotVerified}
              </p>
            ) : (
              <p className="text-sm text-danger">
                {en
                  ? "Verification was rejected. Correct the profile and contact a VMS administrator."
                  : "Verifikasi pabrik ditolak. Perbaiki data profil lalu hubungi Admin VMS."}
              </p>
            )}
          </PanelBody>
        </Panel>
      )}

      <Panel>
        <PanelHeader
          title={en ? "Your batches" : "Batch kamu"}
          description={en ? "Newest first." : "Urut dari yang terbaru."}
        />
        {list.length === 0 ? (
          <PanelBody>
            <EmptyState
              title={en ? "No batches yet" : EMPTY_STATES.noBatches}
              action={
                factory ? (
                  <Link href="/factory/batches/new">
                    <Button size="sm">
                      {en ? "Submit a batch" : "Ajukan batch"} pertama
                    </Button>
                  </Link>
                ) : null
              }
            />
          </PanelBody>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((batch) => {
              const grading = batch.grading_results[0];
              const certificate = batch.certificates[0];
              return (
                <li key={batch.id}>
                  <Link
                    href={`/factory/batches/${batch.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-surface-sunken sm:px-5"
                  >
                    {grading ? <GradeChip grade={grading.grade} /> : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-medium text-ink">
                        {batch.batch_code}
                      </p>
                      <p className="text-sm text-ink-muted">
                        {batch.material_categories
                          ? categoryName(
                              locale,
                              batch.material_categories.code,
                              batch.material_categories.name,
                            )
                          : "—"}{" "}
                        · {formatWeight(batch.claimed_weight_kg, locale)} ·{" "}
                        {formatDate(batch.created_at, locale)}
                      </p>
                    </div>
                    {certificate ? (
                      <span className="font-mono text-xs text-ink-muted">
                        {certificate.certificate_code}
                        {certificate.status === "issued" &&
                        daysUntil(certificate.valid_until) > 0 ? (
                          <span className="mt-1 block font-sans">
                            {en
                              ? `${daysUntil(certificate.valid_until)} days left`
                              : BATCH_FORM_TEXT.remainingDays(
                                  daysUntil(certificate.valid_until),
                                )}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                    <BatchStatusBadge status={batch.status} locale={locale} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
