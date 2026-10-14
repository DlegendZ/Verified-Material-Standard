import Link from "next/link";
import { Wordmark } from "./wordmark";
import { ThemeToggle } from "./theme-toggle";
import { APP, PUBLIC_TEXT } from "@/lib/text";
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/">
            <Wordmark />
          </Link>
          <ThemeToggle />
          <nav className="flex w-full flex-wrap gap-x-5 gap-y-2 text-sm text-brand">
            <Link
              className="inline-flex min-h-11 items-center underline underline-offset-4"
              href="/tentang"
            >
              {PUBLIC_TEXT.aboutNav}
            </Link>
            <Link
              className="inline-flex min-h-11 items-center underline underline-offset-4"
              href="/proses-keberatan"
            >
              {PUBLIC_TEXT.objectionNav}
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-3xl px-4 pb-10 sm:px-6">
        <p className="border-t border-line pt-4 text-xs text-ink-muted">
          {APP.longName} · {APP.demoNotice}
        </p>
      </footer>
    </div>
  );
}
