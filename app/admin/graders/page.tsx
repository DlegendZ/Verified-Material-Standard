import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelBody } from "@/components/ui/panel";
import { getLocale } from "@/lib/locale-server";
import { createSupabaseServerClient, requireRole } from "@/lib/supabase/server";
import { AvailabilityForm } from "./availability-form";

export default async function GradersPage() {
  await requireRole("admin");
  const en = (await getLocale()) === "en";
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, grader_available")
    .eq("role", "grader")
    .order("full_name");

  return (
    <>
      <PageHeader
        title={en ? "Grader availability" : "Ketersediaan grader"}
        description={
          en
            ? "Mark graders unavailable when they are away. Existing assignments stay with their grader."
            : "Tandai grader yang sedang berhalangan. Penugasan yang sudah ada tetap berjalan."
        }
      />
      <Panel>
        <PanelBody>
          {error ? (
            <p role="alert" className="text-danger">
              {en ? "Could not load graders." : "Daftar grader gagal dimuat."}
            </p>
          ) : !data?.length ? (
            <p className="text-ink-muted">
              {en ? "No graders yet." : "Belum ada grader."}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {data.map((grader) => (
                <li
                  key={grader.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-ink">{grader.full_name}</p>
                    <Badge tone={grader.grader_available ? "ok" : "neutral"}>
                      {grader.grader_available
                        ? en
                          ? "Available"
                          : "Tersedia"
                        : en
                          ? "Unavailable"
                          : "Tidak tersedia"}
                    </Badge>
                  </div>
                  <AvailabilityForm
                    id={grader.id}
                    available={grader.grader_available}
                  />
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>
    </>
  );
}
