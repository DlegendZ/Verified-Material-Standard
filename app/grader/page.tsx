import Link from "next/link";
import { MapPin, Package } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { BatchStatusBadge } from "@/components/status-badges";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { formatDate, formatWeight } from "@/lib/format";
import { createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import { EMPTY_STATES } from "@/lib/text";
import type { BatchStatus } from "@/lib/types/db";

export const metadata = { title: "Antrian penugasan" };

interface AssignmentCard {
  id: string;
  assigned_at: string;
  status: string;
  batches: {
    id: string;
    batch_code: string;
    claimed_weight_kg: number;
    status: BatchStatus;
    material_categories: { name: string } | null;
    factories: { legal_name: string; city: string; address: string } | null;
  } | null;
}

export default async function GraderQueuePage() {
  const user = await requireRole("grader");
  const supabase = await createSupabaseServerClient();

  const { data: assignments } = await supabase
    .from("assignments")
    .select(
      "id, assigned_at, status, batches(id, batch_code, claimed_weight_kg, status, material_categories(name), factories(legal_name, city, address))",
    )
    .eq("grader_id", user.id)
    .order("assigned_at", { ascending: true })
    .returns<AssignmentCard[]>();

  const open = (assignments ?? []).filter(
    (item) => item.batches && item.batches.status !== "certified",
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Antrian penugasan"
        description="Buka batch saat kamu sudah di lokasi. Isian tersimpan otomatis di perangkat ini."
      />

      {open.length === 0 ? (
        <EmptyState title={EMPTY_STATES.noAssignments} />
      ) : (
        <ul className="space-y-3">
          {open.map((assignment) => {
            const batch = assignment.batches!;
            return (
              <li key={assignment.id}>
                <Panel className="transition-colors hover:border-line-strong">
                  <Link href={`/grader/batches/${batch.id}`} className="block px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-mono text-sm font-medium text-ink">{batch.batch_code}</p>
                      <BatchStatusBadge status={batch.status} />
                    </div>

                    <p className="mt-2 text-base font-medium text-ink">
                      {batch.factories?.legal_name ?? "—"}
                    </p>

                    <div className="mt-2 space-y-1 text-sm text-ink-muted">
                      <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                        <span>
                          {batch.factories?.address ?? "—"}, {batch.factories?.city ?? "—"}
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Package className="size-4 shrink-0" aria-hidden />
                        <span>
                          {batch.material_categories?.name ?? "—"} ·{" "}
                          {formatWeight(batch.claimed_weight_kg)} klaim
                        </span>
                      </p>
                    </div>

                    <p className="mt-3 text-xs text-ink-muted">
                      Ditugaskan {formatDate(assignment.assigned_at)}
                    </p>
                  </Link>
                </Panel>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
