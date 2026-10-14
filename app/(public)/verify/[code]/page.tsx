import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { PublicShell } from "@/components/public-shell";
import { CertificateView } from "@/components/public-certificate-view";
import { VerifyCodeForm } from "@/components/verify-code-form";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { APP, VERIFY_PAGE, PUBLIC_TEXT } from "@/lib/text";
import type { PublicCertificate } from "@/lib/types/db";
export const revalidate = 60;
const loadCertificate = cache(
  async (code: string): Promise<PublicCertificate | null> => {
    try {
      const { data, error } = await createSupabasePublicClient().rpc(
        "public_certificate",
        { p_code: code },
      );
      if (!error && data) return data as PublicCertificate;
    } catch {}
    return null;
  },
);
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const c = await loadCertificate(code);
  if (!c) return { title: VERIFY_PAGE.notFoundTitle, robots: { index: false } };
  const title = `Grade ${c.grade} — ${c.factory.legal_name}`;
  const description = `${c.category.name}${c.batch.form_profile ? ` (${c.batch.form_profile.name})` : ""}, ${c.batch.claimed_weight_kg} kg. Grade ${c.grade}, skor ${c.final_score}/100. Sertifikat ${c.certificate_code} diverifikasi ${APP.longName}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
  };
}
export default async function VerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const certificate = await loadCertificate(code);
  return (
    <PublicShell>
      {certificate ? (
        <CertificateView certificate={certificate} />
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-danger bg-danger-soft px-5 py-6">
            <h1 className="text-xl font-semibold text-danger">
              {VERIFY_PAGE.notFoundTitle}
            </h1>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink">
              {VERIFY_PAGE.notFoundBody}
            </p>
            <p className="mt-3 break-all font-mono text-sm text-ink-muted">
              {code}
            </p>
          </div>
          <Panel>
            <PanelHeader title={VERIFY_PAGE.tryAnotherCode} />
            <PanelBody>
              <VerifyCodeForm autoFocus />
            </PanelBody>
          </Panel>
          <Link href="/tentang">
            <Button variant="outline">{PUBLIC_TEXT.aboutLink}</Button>
          </Link>
        </div>
      )}
    </PublicShell>
  );
}
