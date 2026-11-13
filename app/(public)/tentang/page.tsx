import { getLocale } from "@/lib/locale-server";
import { faqItemsEn, woodGradesEn } from "@/lib/public-english";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { GradeMeaningTable } from "@/components/grade-meaning-table";
import { ABOUT_TEXT, PUBLIC_CATEGORY_FALLBACK, faqItems } from "@/lib/text";
import { loadPublicCategories } from "@/lib/public-categories";
import { formatValidity } from "@/lib/format";
export async function generateMetadata() {
  return {
    title: (await getLocale()) === "en" ? "About VMS & FAQ" : ABOUT_TEXT.title,
  };
}
export const revalidate = 300;
export default async function AboutPage() {
  const locale = await getLocale();
  const en = locale === "en";
  const categories = await loadPublicCategories();
  const fallback = PUBLIC_CATEGORY_FALLBACK.find(
    (c) => c.code === "solid_wood",
  )!;
  const wood = categories.find((c) => c.code === "solid_wood") ?? fallback;
  return (
    <PublicShell>
      <article className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            {en ? "About VMS & FAQ" : ABOUT_TEXT.title}
          </h1>
          <p className="mt-5 text-base leading-8 text-ink-muted">
            {en
              ? "Verified Material Standard is an independent service for factory and workshop production residues. We sample three points in a batch and issue a digital grade certificate that anyone can check by link or QR. The pilot covers solid wood. VMS does not sell material, handle transactions, or set prices."
              : ABOUT_TEXT.summary}
          </p>
        </div>
        <section>
          <h2 className="mb-4 text-xl font-semibold text-ink">
            {en ? "Frequently asked questions" : ABOUT_TEXT.faqTitle}
          </h2>
          <div className="space-y-3">
            {(en ? faqItemsEn : faqItems)(
              formatValidity(
                wood.certificate_validity_days ??
                  fallback.certificate_validity_days!,
                locale,
              ),
            ).map((item) => (
              <details
                key={item.question}
                className="rounded-2xl border border-line bg-surface"
              >
                <summary className="min-h-11 cursor-pointer px-4 py-4 text-sm font-semibold leading-6 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                  {item.question}
                </summary>
                <div className="space-y-4 border-t border-line px-4 py-4">
                  <p className="text-sm leading-7 text-ink-muted">
                    {item.answer}
                  </p>
                  {item.gradeTable ? (
                    <GradeMeaningTable
                      categoryName={en ? "Solid wood" : wood.name}
                      locale={locale}
                      meanings={
                        en
                          ? woodGradesEn
                          : (wood.grade_meanings ?? fallback.grade_meanings)
                      }
                    />
                  ) : null}
                  {item.objectionLink ? (
                    <Link
                      href="/proses-keberatan"
                      className="inline-flex min-h-11 items-center text-sm font-medium text-brand underline"
                    >
                      {en
                        ? "See the appeals process"
                        : ABOUT_TEXT.objectionLink}
                    </Link>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        </section>
      </article>
    </PublicShell>
  );
}
