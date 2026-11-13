import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKETS, isBatchFilePath } from "@/lib/storage";
import type { BatchDocumentRow } from "@/lib/types/db";
import { getLocale } from "@/lib/locale-server";
import { formatDate } from "@/lib/format";
import { Panel, PanelBody, PanelHeader } from "./ui/panel";

export async function BatchDocuments({
  supabase,
  batchId,
  children,
}: {
  supabase: SupabaseClient;
  batchId: string;
  children?: React.ReactNode;
}) {
  const en = (await getLocale()) === "en";
  const { data, error } = await supabase
    .from("batch_documents")
    .select("*")
    .eq("batch_id", batchId)
    .order("uploaded_at")
    .returns<BatchDocumentRow[]>();
  const documents = (data ?? []).filter((file) =>
    isBatchFilePath(batchId, file.file_path),
  );
  const { data: links } = documents.length
    ? await supabase.storage.from(BUCKETS.documents).createSignedUrls(
        documents.map((file) => file.file_path),
        600,
      )
    : { data: [] };
  const labels = en
    ? {
        origin_doc: "Proof of origin",
        lab_test: "Lab test results",
        other: "Other document",
      }
    : {
        origin_doc: "Dokumen asal-usul",
        lab_test: "Hasil uji lab",
        other: "Dokumen lain",
      };

  return (
    <Panel>
      <PanelHeader
        title={en ? "Batch documents" : "Dokumen batch"}
        description={
          en
            ? "Proof of origin is required at the gate. Lab results add 25 documentation points."
            : "Dokumen asal-usul wajib diperiksa di gerbang. Hasil uji lab menambah 25 poin dokumentasi."
        }
      />
      <PanelBody className="space-y-4">
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {en ? "Documents could not be loaded." : "Dokumen gagal dimuat."}
          </p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-ink-muted">
            {en ? "No documents yet." : "Belum ada dokumen."}
          </p>
        ) : (
          <ul className="space-y-2">
            {documents.map((file) => {
              const label = `${labels[file.kind]} · ${file.file_path.split(".").at(-1)?.toUpperCase()}`;
              const url = links?.find(
                (link) => link.path === file.file_path,
              )?.signedUrl;
              return (
                <li
                  key={file.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm"
                >
                  {url ? (
                    <a
                      className="font-medium text-brand underline underline-offset-4"
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {label}
                    </a>
                  ) : (
                    <span>
                      {label} (
                      {en ? "link unavailable" : "tautan tidak tersedia"})
                    </span>
                  )}
                  <span className="text-ink-muted">
                    {formatDate(file.uploaded_at, en ? "en" : "id")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {children}
      </PanelBody>
    </Panel>
  );
}
