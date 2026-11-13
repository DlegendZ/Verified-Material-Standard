import { getLocale } from "@/lib/locale-server";
import { categoryName } from "@/lib/public-english";
import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { PublicShell } from "@/components/public-shell";
import { CertificateView } from "@/components/public-certificate-view";
import { VerifyCodeForm } from "@/components/verify-code-form";
import { Button } from "@/components/ui/button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { getPublicCertificate } from "@/lib/supabase/public";
import { APP, VERIFY_PAGE, PUBLIC_TEXT } from "@/lib/text";
import type { PublicCertificate } from "@/lib/types/db";
const loadCertificate = cache(
  async (code: string): Promise<PublicCertificate | null> => {
    try {
      return await getPublicCertificate(code.toUpperCase());
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
  const locale = await getLocale();
  const en = locale === "en";
  const c = await loadCertificate(code);
  if (!c)
    return {
      title: en ? "Certificate not found" : VERIFY_PAGE.notFoundTitle,
      robots: { index: false },
    };
  const title = `Grade ${c.grade} — ${c.factory.legal_name}`;
  const description = en
    ? `${categoryName(locale, c.category.code, c.category.name)}, ${c.batch.claimed_weight_kg} kg. Grade ${c.grade}, score ${c.final_score}/100. Certificate ${c.certificate_code} verified by VMS.`
    : `${c.category.name}${c.batch.form_profile ? ` (${c.batch.form_profile.name})` : ""}, ${c.batch.claimed_weight_kg} kg. Grade ${c.grade}, skor ${c.final_score}/100. Sertifikat ${c.certificate_code} diverifikasi ${APP.longName}.`;
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
  const locale = await getLocale();
  const en = locale === "en";
  const certificate = await loadCertificate(code);
  return (
    <PublicShell>
      {certificate ? (
        <CertificateView certificate={certificate} locale={locale} />
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-danger bg-danger-soft px-5 py-6">
            <h1 className="text-xl font-semibold text-danger">
              {en ? "Certificate not found" : VERIFY_PAGE.notFoundTitle}
            </h1>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink">
              {en
                ? "Check the code against the seller’s certificate, then try again."
                : VERIFY_PAGE.notFoundBody}
            </p>
            <p className="mt-3 break-all font-mono text-sm text-ink-muted">
              {code}
            </p>
          </div>
          <Panel>
            <PanelHeader
              title={en ? "Try another code" : VERIFY_PAGE.tryAnotherCode}
            />
            <PanelBody>
              <VerifyCodeForm autoFocus />
            </PanelBody>
          </Panel>
          <Link href="/tentang">
            <Button variant="outline">
              {en ? "How it works & FAQ" : PUBLIC_TEXT.aboutLink}
            </Button>
          </Link>
        </div>
      )}
    </PublicShell>
  );
}
