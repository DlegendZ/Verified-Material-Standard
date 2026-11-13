import Link from "next/link";
import { Wordmark } from "./wordmark";
import { ThemeToggle } from "./theme-toggle";
import { APP, PUBLIC_TEXT } from "@/lib/text";
import { getLocale } from "@/lib/locale-server";
import { LocaleToggle } from "./locale-toggle";
export async function PublicShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  const en = (await getLocale()) === "en";
  const width = wide ? "max-w-6xl" : "max-w-3xl";
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-surface">
        <div
          className={`mx-auto flex w-full ${width} flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6`}
        >
          <Link href="/">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-2">
            <LocaleToggle />
            <ThemeToggle />
          </div>
          <nav className="flex w-full flex-wrap gap-x-5 gap-y-2 text-sm text-brand">
            <Link
              className="inline-flex min-h-11 items-center underline underline-offset-4"
              href="/katalog"
            >
              {en ? "Verified materials" : "Katalog terverifikasi"}
            </Link>
            <Link
              className="inline-flex min-h-11 items-center underline underline-offset-4"
              href="/tentang"
            >
              {en ? "About & FAQ" : PUBLIC_TEXT.aboutNav}
            </Link>
            <Link
              className="inline-flex min-h-11 items-center underline underline-offset-4"
              href="/proses-keberatan"
            >
              {en ? "Appeals process" : PUBLIC_TEXT.objectionNav}
            </Link>
          </nav>
        </div>
      </header>
      <main className={`mx-auto w-full ${width} px-4 py-8 sm:px-6`}>
        {children}
      </main>
      <footer className={`mx-auto w-full ${width} px-4 pb-10 sm:px-6`}>
        <p className="border-t border-line pt-4 text-xs text-ink-muted">
          {APP.longName} ·{" "}
          {en
            ? "Prototype · Demo data · Not an official certification body"
            : APP.demoNotice}
        </p>
      </footer>
    </div>
  );
}
