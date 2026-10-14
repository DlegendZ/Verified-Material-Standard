import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { GradeMeaningTable } from "@/components/grade-meaning-table";
import { ABOUT_TEXT, PUBLIC_CATEGORY_FALLBACK, faqItems } from "@/lib/text";
import { loadPublicCategories } from "@/lib/public-categories";
import { formatValidity } from "@/lib/format";
export const metadata = { title: ABOUT_TEXT.title };
export const revalidate = 300;
export default async function AboutPage() {
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
            {ABOUT_TEXT.title}
          </h1>
          <p className="mt-5 text-base leading-8 text-ink-muted">
            {ABOUT_TEXT.summary}
          </p>
        </div>
        <section>
          <h2 className="mb-4 text-xl font-semibold text-ink">
            {ABOUT_TEXT.faqTitle}
          </h2>
          <div className="space-y-3">
            {faqItems(
              formatValidity(
                wood.certificate_validity_days ??
                  fallback.certificate_validity_days!,
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
                      categoryName={wood.name}
                      meanings={wood.grade_meanings ?? fallback.grade_meanings}
                    />
                  ) : null}
                  {item.objectionLink ? (
                    <Link
                      href="/proses-keberatan"
                      className="inline-flex min-h-11 items-center text-sm font-medium text-brand underline"
                    >
                      {ABOUT_TEXT.objectionLink}
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
