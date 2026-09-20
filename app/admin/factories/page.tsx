import { PageHeader } from "@/components/app-shell";
import { FactoryStatusBadge } from "@/components/status-badges";
import { EmptyState } from "@/components/ui/empty-state";
import { DataRow, Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { VerificationButtons } from "./verification-buttons";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import type { FactoryRow } from "@/lib/types/db";

export const metadata = { title: "Verifikasi pabrik" };

export default async function AdminFactoriesPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const { data: factories } = await supabase
    .from("factories")
    .select("*")
    .order("verification_status", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<FactoryRow[]>();

  const list = factories ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pabrik"
        description="Verifikasi memastikan pabrik yang mengajukan batch benar-benar ada dan bisa dihubungi."
      />

      {list.length === 0 ? (
        <EmptyState title="Belum ada pabrik terdaftar." />
      ) : (
        list.map((factory) => (
          <Panel key={factory.id}>
            <PanelHeader
              title={factory.legal_name}
              description={factory.city}
              action={<FactoryStatusBadge status={factory.verification_status} />}
            />
            <PanelBody className="space-y-4">
              <dl>
                <DataRow label="Alamat" value={factory.address} />
                <DataRow label="Kontak" value={factory.contact_person} />
                <DataRow label="Telepon" value={factory.contact_phone} mono />
                <DataRow label="Didaftarkan" value={formatDate(factory.created_at)} />
                {factory.verified_at ? (
                  <DataRow label="Diverifikasi" value={formatDate(factory.verified_at)} />
                ) : null}
              </dl>

              {factory.verification_status !== "verified" ? (
                <VerificationButtons factoryId={factory.id} />
              ) : null}
            </PanelBody>
          </Panel>
        ))
      )}
    </div>
  );
}
