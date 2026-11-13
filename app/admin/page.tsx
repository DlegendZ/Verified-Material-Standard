import { categoryName } from "@/lib/public-english";
import { getLocale } from "@/lib/locale-server";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { FactoryStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GradeChip } from "@/components/ui/grade";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { formatDate, formatWeight } from "@/lib/format";
import { createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import { EMPTY_STATES } from "@/lib/text";
import type { FactoryRow, GradeDb } from "@/lib/types/db";

export const metadata = { title: "Dashboard admin" };

interface PendingBatch {
  id: string;
  batch_code: string;
  claimed_weight_kg: number;
  created_at: string;
  material_categories: { code: string; name: string } | null;
  factories: { legal_name: string; city: string } | null;
}

interface AwaitingIssuance extends PendingBatch {
  grading_results: { grade: GradeDb; final_score: number }[];
}

export default async function AdminDashboardPage() {
  const locale = await getLocale();
  const en = locale === "en";
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const [{ data: pendingFactories }, { data: unassigned }, { data: awaiting }] =
    await Promise.all([
      supabase
        .from("factories")
        .select("*")
        .eq("verification_status", "pending")
        .order("created_at", { ascending: true })
        .returns<FactoryRow[]>(),
      supabase
        .from("batches")
        .select(
          "id, batch_code, claimed_weight_kg, created_at, material_categories(code, name), factories(legal_name, city)",
        )
        .eq("status", "submitted")
        .order("created_at", { ascending: true })
        .returns<PendingBatch[]>(),
      supabase
        .from("batches")
        .select(
          "id, batch_code, claimed_weight_kg, created_at, material_categories(code, name), factories(legal_name, city), grading_results(grade, final_score)",
        )
        .eq("status", "computed")
        .order("updated_at", { ascending: true })
        .returns<AwaitingIssuance[]>(),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={en ? "Admin dashboard" : "Dashboard admin"}
        description={
          en
            ? "Three queues: verify factories, assign graders, and issue certificates."
            : "Tiga antrian kerja: verifikasi pabrik, penugasan grader, dan penerbitan sertifikat."
        }
      />

      <Panel>
        <PanelHeader
          title={
            en
              ? "Factories awaiting verification"
              : "Pabrik menunggu verifikasi"
          }
          action={
            <Link href="/admin/factories">
              <Button variant="outline" size="sm">
                {en ? "View all factories" : "Lihat semua pabrik"}
              </Button>
            </Link>
          }
        />
        {(pendingFactories ?? []).length === 0 ? (
          <PanelBody>
            <EmptyState
              title={
                en
                  ? "No factories awaiting verification"
                  : EMPTY_STATES.noPendingFactories
              }
            />
          </PanelBody>
        ) : (
          <ul className="divide-y divide-line">
            {(pendingFactories ?? []).map((factory) => (
              <li
                key={factory.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {factory.legal_name}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {factory.city} · {en ? "registered" : "didaftarkan"}{" "}
                    {formatDate(factory.created_at, locale)}
                  </p>
                </div>
                <FactoryStatusBadge
                  status={factory.verification_status}
                  locale={locale}
                />
                <Link href="/admin/factories">
                  <Button size="sm" variant="outline">
                    {en ? "Review" : "Tinjau"}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title={
            en
              ? "Batches awaiting assignment"
              : "Batch menunggu penugasan grader"
          }
        />
        {(unassigned ?? []).length === 0 ? (
          <PanelBody>
            <EmptyState
              title={
                en
                  ? "No batches awaiting assignment"
                  : EMPTY_STATES.noPendingBatches
              }
            />
          </PanelBody>
        ) : (
          <ul className="divide-y divide-line">
            {(unassigned ?? []).map((batch) => (
              <li key={batch.id}>
                <Link
                  href={`/admin/batches/${batch.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-sunken sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-medium text-ink">
                      {batch.batch_code}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {batch.factories?.legal_name ?? "—"} ·{" "}
                      {batch.material_categories
                        ? categoryName(
                            locale,
                            batch.material_categories.code,
                            batch.material_categories.name,
                          )
                        : "—"}{" "}
                      · {formatWeight(batch.claimed_weight_kg, locale)}
                    </p>
                  </div>
                  <span className="text-sm text-ink-muted">
                    {formatDate(batch.created_at, locale)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title={
            en
              ? "Assessments awaiting certificate issue"
              : "Hasil penilaian menunggu penerbitan"
          }
          description={
            en
              ? "The grader has completed the assessment. Review it before issuing a certificate."
              : "Grader sudah selesai menilai. Tinjau sebelum menerbitkan sertifikat."
          }
        />
        {(awaiting ?? []).length === 0 ? (
          <PanelBody>
            <EmptyState
              title={
                en
                  ? "No assessments awaiting issue"
                  : EMPTY_STATES.noPendingIssuance
              }
            />
          </PanelBody>
        ) : (
          <ul className="divide-y divide-line">
            {(awaiting ?? []).map((batch) => {
              const grading = batch.grading_results[0];
              return (
                <li key={batch.id}>
                  <Link
                    href={`/admin/batches/${batch.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-sunken sm:px-5"
                  >
                    {grading ? <GradeChip grade={grading.grade} /> : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-medium text-ink">
                        {batch.batch_code}
                      </p>
                      <p className="text-sm text-ink-muted">
                        {batch.factories?.legal_name ?? "—"} ·{" "}
                        {batch.material_categories
                          ? categoryName(
                              locale,
                              batch.material_categories.code,
                              batch.material_categories.name,
                            )
                          : "—"}
                      </p>
                    </div>
                    {grading ? (
                      <span className="font-mono tabular text-sm text-ink">
                        {grading.final_score}
                      </span>
                    ) : null}
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
