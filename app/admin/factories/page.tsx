import { getLocale } from "@/lib/locale-server";
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
  const locale = await getLocale();
  const en = locale === "en";
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
        title={en ? "Factories" : "Pabrik"}
        description={
          en
            ? "Verification confirms that the factory exists and can be contacted."
            : "Verifikasi memastikan pabrik yang mengajukan batch benar-benar ada dan bisa dihubungi."
        }
      />

      {list.length === 0 ? (
        <EmptyState
          title={
            en ? "No registered factories." : "Belum ada pabrik terdaftar."
          }
        />
      ) : (
        list.map((factory) => (
          <Panel key={factory.id}>
            <PanelHeader
              title={factory.legal_name}
              description={factory.city}
              action={
                <FactoryStatusBadge
                  status={factory.verification_status}
                  locale={locale}
                />
              }
            />
            <PanelBody className="space-y-4">
              <dl>
                <DataRow
                  label={en ? "Address" : "Alamat"}
                  value={factory.address}
                />
                <DataRow
                  label={en ? "Contact" : "Kontak"}
                  value={factory.contact_person}
                />
                <DataRow
                  label={en ? "Phone" : "Telepon"}
                  value={factory.contact_phone}
                  mono
                />
                <DataRow
                  label={en ? "Registered" : "Didaftarkan"}
                  value={formatDate(factory.created_at, locale)}
                />
                {factory.verified_at ? (
                  <DataRow
                    label={en ? "Verified" : "Diverifikasi"}
                    value={formatDate(factory.verified_at, locale)}
                  />
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
