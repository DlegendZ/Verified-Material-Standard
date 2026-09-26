import { cn } from "@/lib/cn";
import { APP } from "@/lib/text";

export function Wordmark({
  showLongName = true,
  className,
}: {
  showLongName?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("wordmark inline-flex items-center gap-2.5", className)}
    >
      <span
        className="brand-mark flex size-10 items-center justify-center rounded-[14px] text-white"
        aria-hidden
      >
        <svg viewBox="0 0 48 48" fill="none" className="size-8">
          <path d="M8 12h10l8 16 9-16h6L28 38h-8L8 12Z" fill="white" />
          <path d="M8 12h10l8 16-4 8L8 12Z" fill="#A8F5FF" />
          <path d="M28 38 41 12h-6l-9 16-4 8 6 2Z" fill="#E8F9FF" />
          <circle cx="38" cy="33" r="3" fill="#B8FFB4" />
        </svg>
      </span>
      <span className="font-[var(--font-display)] text-[1.45rem] font-extrabold tracking-[-.085em] text-ink">
        {APP.name}
        <span className="text-[#6859e8]">.</span>
      </span>
      {showLongName ? (
        <span className="hidden border-l border-line pl-3 text-[10px] font-bold uppercase leading-tight tracking-[.11em] text-ink-muted lg:inline">
          {APP.longName}
        </span>
      ) : null}
    </span>
  );
}
