import { cn } from "@/lib/cn";
import { APP } from "@/lib/text";

/**
 * Wordmark VMS: tiga huruf dalam blok hijau seperti cap pemeriksaan, diikuti
 * nama panjangnya. Tanpa ikon — lembaga sertifikasi dikenali dari capnya.
 */
export function Wordmark({
  showLongName = true,
  className,
}: {
  showLongName?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="rounded-[2px] bg-brand px-1.5 py-0.5 font-mono text-sm font-semibold tracking-wide text-brand-ink">
        {APP.name}
      </span>
      {showLongName ? (
        <span className="hidden text-sm font-medium text-ink sm:inline">{APP.longName}</span>
      ) : null}
    </span>
  );
}
