import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { BatchStatusBadge, FactoryStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GradeChip } from "@/components/ui/grade";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { formatDate, formatWeight } from "@/lib/format";
import { createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import { EMPTY_STATES, ERRORS } from "@/lib/text";
import type { BatchStatus, FactoryRow, GradeDb } from "@/lib/types/db";

export const metadata = { title: "Dashboard pabrik" };

interface BatchListRow {
  id: string;
  batch_code: string;
  status: BatchStatus;
  claimed_weight_kg: number;
  created_at: string;
  material_categories: { name: string } | null;
  grading_results: { grade: GradeDb; final_score: number }[];
  certificates: { certificate_code: string; status: string }[];
}

export default async function FactoryDashboardPage() {
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
          "id, batch_code, status, claimed_weight_kg, created_at, material_categories(name), grading_results(grade, final_score), certificates(certificate_code, status)",
        )
        .eq("factory_id", factory.id)
        .order("created_at", { ascending: false })
        .returns<BatchListRow[]>()
    : { data: [] as BatchListRow[] };

  const list = batches ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={factory ? factory.legal_name : "Dashboard pabrik"}
        description={
          factory
            ? `${factory.city} · ${list.length} batch terdaftar`
            : "Lengkapi profil pabrik untuk mulai mengajukan batch."
        }
        action={
          factory ? (
            <Link href="/factory/batches/new">
              <Button>Ajukan batch</Button>
            </Link>
          ) : null
        }
      />

      {!factory ? (
        <EmptyState
          title="Profil pabrik belum diisi"
          description="Admin VMS perlu data pabrik untuk memverifikasi kamu sebelum batch pertama bisa diajukan."
          action={
            <Link href="/factory/profile">
              <Button>Isi profil pabrik</Button>
            </Link>
          }
        />
      ) : (
        <Panel>
          <PanelHeader
            title="Status verifikasi pabrik"
            action={<FactoryStatusBadge status={factory.verification_status} />}
          />
          <PanelBody>
            {factory.verification_status === "verified" ? (
              <p className="text-sm text-ink-muted">
                Pabrik terverifikasi sejak {formatDate(factory.verified_at)}. Kamu bisa mengajukan
                batch kapan saja.
              </p>
            ) : factory.verification_status === "pending" ? (
              <p className="text-sm text-ink-muted">{ERRORS.factoryNotVerified}</p>
            ) : (
              <p className="text-sm text-danger">
                Verifikasi pabrik ditolak. Perbaiki data profil lalu hubungi Admin VMS.
              </p>
            )}
          </PanelBody>
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Batch kamu" description="Urut dari yang terbaru." />
        {list.length === 0 ? (
          <PanelBody>
            <EmptyState
              title={EMPTY_STATES.noBatches}
              action={
                factory ? (
                  <Link href="/factory/batches/new">
                    <Button size="sm">Ajukan batch pertama</Button>
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
                      <p className="font-mono text-sm font-medium text-ink">{batch.batch_code}</p>
                      <p className="text-sm text-ink-muted">
                        {batch.material_categories?.name ?? "—"} ·{" "}
                        {formatWeight(batch.claimed_weight_kg)} · {formatDate(batch.created_at)}
                      </p>
                    </div>
                    {certificate ? (
                      <span className="font-mono text-xs text-ink-muted">
                        {certificate.certificate_code}
                      </span>
                    ) : null}
                    <BatchStatusBadge status={batch.status} />
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
