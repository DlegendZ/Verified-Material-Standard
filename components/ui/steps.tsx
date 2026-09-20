import { cn } from "@/lib/cn";

/**
 * Penanda langkah wizard grading. Urutan di sini memang urutan kerja di
 * lapangan, jadi penomoran benar-benar bermakna — bukan hiasan.
 */
export function Steps({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number;
  className?: string;
}) {
  return (
    <nav aria-label="Langkah penilaian" className={cn("border-b border-line", className)}>
      <ol className="flex items-stretch overflow-x-auto">
        {steps.map((step, index) => {
          const state = index === current ? "current" : index < current ? "done" : "todo";
          return (
            <li key={step} className="min-w-0 flex-1">
              <div
                aria-current={state === "current" ? "step" : undefined}
                className={cn(
                  "flex h-full items-center gap-2 border-b-2 px-3 py-2.5",
                  state === "current" && "border-brand text-ink",
                  state === "done" && "border-brand/40 text-ink-muted",
                  state === "todo" && "border-transparent text-ink-muted",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-[2px] font-mono text-xs font-semibold",
                    state === "current" && "bg-brand text-brand-ink",
                    state !== "current" && "bg-surface-sunken text-ink-muted",
                  )}
                >
                  {index + 1}
                </span>
                <span className="truncate text-sm font-medium">{step}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
