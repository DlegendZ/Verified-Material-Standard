import Link from "next/link";
import { signOutAction } from "@/app/(auth)/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { APP, ROLE_LABELS } from "@/lib/text";
import type { UserRole } from "@/lib/types/db";

export interface NavItem {
  href: string;
  label: string;
}

/**
 * Kerangka halaman untuk area yang butuh login.
 * Navigasi ditentukan peran, bukan disembunyikan-tampilkan di client.
 */
export function AppShell({
  role,
  fullName,
  nav,
  children,
}: {
  role: UserRole;
  fullName: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-surface/90">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="rounded-xl">
              <Wordmark showLongName={false} />
            </Link>
            <span className="truncate text-sm text-ink-muted">
              {ROLE_LABELS[role]} · {fullName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-xl border border-line px-3 py-2 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>

        {nav.length > 1 ? (
          <nav
            aria-label="Navigasi utama"
            className="mx-auto w-full max-w-6xl px-4 sm:px-6"
          >
            <ul className="-mb-px flex gap-1 overflow-x-auto">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-block whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-ink-muted hover:border-line-strong hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
        <p className="border-t border-line pt-4 text-xs text-ink-muted">
          {APP.demoNotice}
        </p>
      </footer>
    </div>
  );
}

/** Judul halaman + aksi utama, dipakai seragam di seluruh dashboard. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
