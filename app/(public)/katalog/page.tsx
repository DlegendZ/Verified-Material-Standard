import Link from "next/link";
import { ArrowRight, Boxes, Factory, Search, ShieldCheck } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { GradeChip } from "@/components/ui/grade";
import { Input, Select } from "@/components/ui/field";
import { formatDate, formatScore, formatWeight } from "@/lib/format";
import { getLocale } from "@/lib/locale-server";
import { categoryName } from "@/lib/public-english";
import { BUCKETS, publicObjectUrl } from "@/lib/storage";
import {
  catalogFilters,
  CATALOG_PAGE_SIZE,
  loadVerifiedCatalog,
} from "@/lib/verified-catalog";

export async function generateMetadata() {
  return {
    title:
      (await getLocale()) === "en"
        ? "Verified materials"
        : "Katalog material terverifikasi",
  };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const en = locale === "en";
  const filters = catalogFilters(await searchParams);
  const catalog = await loadVerifiedCatalog(filters);
  const lastPage = Math.min(
    10_000,
    Math.ceil((catalog?.total ?? 0) / CATALOG_PAGE_SIZE),
  );
  function href(page: number) {
    const query = new URLSearchParams();
    if (filters.q) query.set("q", filters.q);
    if (filters.grade) query.set("grade", filters.grade);
    if (page > 1) query.set("page", String(page));
    return query.size ? `/katalog?${query}` : "/katalog";
  }

  return (
    <PublicShell wide>
      <div className="space-y-8">
        <section className="rounded-3xl border border-line bg-brand-soft p-6 sm:p-9">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand">
            <ShieldCheck className="size-5" aria-hidden /> VMS ·{" "}
            {en ? "Material catalog" : "Katalog material"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {en ? "Verified materials" : "Material terverifikasi"}
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">
            {en
              ? "Browse batches with active certificates, compare grades, and see which factories supplied them."
              : "Jelajahi batch bersertifikat aktif, bandingkan grade, dan lihat pabrik yang memasoknya."}
          </p>
          <form
            action="/katalog"
            className="mt-6 grid items-end gap-3 sm:grid-cols-[1fr_auto_auto]"
          >
            <div className="space-y-1.5">
              <label
                className="block text-sm font-medium text-ink"
                htmlFor="catalog-search"
              >
                {en
                  ? "Search materials or factories"
                  : "Cari material atau pabrik"}
              </label>
              <Input
                id="catalog-search"
                name="q"
                type="search"
                defaultValue={filters.q}
                maxLength={100}
                placeholder={
                  en
                    ? "e.g. solid wood or Jepara"
                    : "Contoh: kayu solid atau Jepara"
                }
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="block text-sm font-medium text-ink"
                htmlFor="catalog-grade"
              >
                Grade
              </label>
              <Select
                id="catalog-grade"
                name="grade"
                defaultValue={filters.grade}
              >
                <option value="">{en ? "All grades" : "Semua grade"}</option>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
              </Select>
            </div>
            <button type="submit" className={buttonVariants()}>
              <Search className="size-4" aria-hidden /> {en ? "Search" : "Cari"}
            </button>
          </form>
        </section>

        {catalog?.featured.length ? (
          <section aria-labelledby="featured-factories">
            <h2
              id="featured-factories"
              className="text-xl font-semibold text-ink"
            >
              {en
                ? "Factories with Grade A batches"
                : "Pabrik dengan batch Grade A"}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {en
                ? "Based on active certificates for individual batches."
                : "Berdasarkan sertifikat aktif per batch."}
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.featured.map((factory, index) => (
                <li
                  key={`${factory.factory_name}-${factory.city}-${index}`}
                  className="rounded-2xl border border-line bg-surface p-4"
                >
                  <Link
                    className="flex items-start gap-3 text-ink hover:text-brand"
                    href={`/katalog?${new URLSearchParams({ q: factory.factory_name })}`}
                  >
                    <Factory
                      aria-hidden
                      className="mt-1 size-5 shrink-0 text-brand"
                    />
                    <div>
                      <p className="font-semibold">{factory.factory_name}</p>
                      <p className="text-sm text-ink-muted">{factory.city}</p>
                    </div>
                  </Link>
                  <p className="mt-3 text-sm text-ink-muted">
                    <strong className="text-ink">
                      {factory.grade_a_batches} Grade A
                    </strong>{" "}
                    · {factory.active_batches}{" "}
                    {en ? "certified batches" : "batch bersertifikat"} ·{" "}
                    {en ? "Best score" : "Skor tertinggi"}{" "}
                    {formatScore(factory.best_score, locale)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="catalog-results">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="catalog-results" className="text-xl font-semibold text-ink">
              {en ? "Certified batches" : "Batch bersertifikat"}
              {catalog ? ` (${catalog.total})` : ""}
            </h2>
            {(filters.q || filters.grade) && (
              <Link className="text-sm text-brand underline" href="/katalog">
                {en ? "Clear filters" : "Hapus filter"}
              </Link>
            )}
          </div>
          {!catalog ? (
            <p
              role="alert"
              className="rounded-2xl border border-line bg-surface p-6 text-ink-muted"
            >
              {en
                ? "The catalog could not be loaded. Please try again."
                : "Katalog belum bisa dimuat. Coba lagi."}
            </p>
          ) : !catalog.items.length ? (
            <p className="rounded-2xl border border-line bg-surface p-6 text-ink-muted">
              {en
                ? "No active certificates match this search."
                : "Tidak ada sertifikat aktif yang cocok."}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.items.map((item) => (
                <article
                  key={item.certificate_code}
                  className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface"
                >
                  <div className="relative grid aspect-[2/1] place-items-center bg-surface-sunken">
                    {item.photo_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={publicObjectUrl(BUCKETS.photos, item.photo_path)}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <Boxes className="size-12 text-ink-muted" aria-hidden />
                    )}
                    <div className="absolute right-3 top-3">
                      <Badge tone="ok">
                        {en ? "Verified" : "Terverifikasi"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <p className="text-xs font-medium text-brand">
                      {categoryName(
                        locale,
                        item.category_code,
                        item.category_name,
                      )}
                    </p>
                    <h3 className="break-words text-lg font-semibold text-ink">
                      {item.declared_material_type ||
                        categoryName(
                          locale,
                          item.category_code,
                          item.category_name,
                        )}
                    </h3>
                    <p className="text-sm text-ink-muted">
                      {item.factory_name} · {item.city}
                    </p>
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <GradeChip grade={item.grade} />{" "}
                      {formatScore(item.final_score, locale)}/100 ·{" "}
                      {formatWeight(item.claimed_weight_kg, locale)}
                    </p>
                    <p className="break-words text-xs text-ink-muted">
                      {item.batch_code} ·{" "}
                      {en ? "Valid until" : "Berlaku sampai"}{" "}
                      {formatDate(item.valid_until, locale)}
                    </p>
                    <Link
                      href={`/verify/${encodeURIComponent(item.certificate_code)}`}
                      className="mt-auto inline-flex min-h-11 items-center gap-2 pt-2 text-sm font-semibold text-brand hover:underline"
                    >
                      {en ? "View certificate" : "Lihat sertifikat"}{" "}
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
          {catalog && (filters.page > 1 || filters.page < lastPage) && (
            <nav
              aria-label={en ? "Catalog pages" : "Halaman katalog"}
              className="mt-5 flex flex-wrap gap-3"
            >
              {filters.page > 1 && (
                <Link
                  className={buttonVariants({ variant: "outline" })}
                  href={href(Math.min(filters.page - 1, Math.max(1, lastPage)))}
                >
                  {en ? "Previous" : "Sebelumnya"}
                </Link>
              )}
              {filters.page < lastPage && (
                <Link
                  className={buttonVariants({ variant: "outline" })}
                  href={href(filters.page + 1)}
                >
                  {en ? "Next" : "Berikutnya"}
                </Link>
              )}
            </nav>
          )}
        </section>
        <p className="text-sm text-ink-muted">
          {en
            ? "The grade describes the sampled batch. Ask the factory about stock or price; VMS does not handle transactions."
            : "Grade menjelaskan batch yang disampling. Tanyakan stok atau harga ke pabrik; VMS tidak menangani transaksi."}
        </p>
      </div>
    </PublicShell>
  );
}
