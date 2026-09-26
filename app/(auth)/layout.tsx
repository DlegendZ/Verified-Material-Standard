import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6">
        <Link href="/" className="rounded-xl">
          <Wordmark />
        </Link>
        <ThemeToggle />
      </header>
      <main className="mx-auto w-full max-w-md px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
