import { Badge } from "@/components/ui/badge";
import { formatValidity } from "@/lib/format";
import { PUBLIC_TEXT } from "@/lib/text";
import type { PublicCategory } from "@/lib/types/db";
export function MaterialCategories({
  categories,
}: {
  categories: PublicCategory[];
}) {
  return (
    <section
      id="material"
      className="mx-auto w-full max-w-7xl scroll-mt-24 px-5 pb-20 sm:px-8 lg:px-12"
    >
      <div className="mb-8">
        <p className="section-eyebrow">{PUBLIC_TEXT.materialEyebrow}</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {PUBLIC_TEXT.materialTitle}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-ink-muted">
          {PUBLIC_TEXT.materialDescription}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {categories.map((c) => (
          <article
            key={c.code}
            className={`rounded-[26px] border border-line bg-surface p-5 sm:p-6 ${c.status === "live" ? "md:col-span-3 bg-brand-soft" : ""}`}
          >
            <Badge tone={c.status === "live" ? "brand" : "neutral"}>
              {c.status === "live"
                ? PUBLIC_TEXT.pilotBadge
                : PUBLIC_TEXT.comingSoonBadge}
            </Badge>
            <h3 className="mt-4 text-xl font-semibold text-ink">{c.name}</h3>
            <p className="mt-2 text-sm leading-7 text-ink-muted">
              {c.short_description}
            </p>
            {c.profiles.length ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {c.profiles.map((p) => (
                  <li
                    key={p.code}
                    className="rounded-full border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
                  >
                    {p.name}
                  </li>
                ))}
              </ul>
            ) : null}
            {c.certificate_validity_days ? (
              <p className="mt-4 text-sm font-medium text-ink">
                {PUBLIC_TEXT.categoryValidity(
                  formatValidity(c.certificate_validity_days),
                )}
              </p>
            ) : null}
          </article>
        ))}
      </div>
      <p className="mt-5 text-sm leading-relaxed text-ink-muted">
        {PUBLIC_TEXT.materialBoundary}
      </p>
    </section>
  );
}
