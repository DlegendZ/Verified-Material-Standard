import { cn } from "@/lib/cn";

/** Layar kosong adalah ajakan bertindak, bukan sekadar pemberitahuan kosong. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 border border-dashed border-line-strong bg-surface-sunken px-5 py-8",
        className,
      )}
    >
      <p className="text-base font-medium text-ink">{title}</p>
      {description ? <p className="max-w-prose text-sm text-ink-muted">{description}</p> : null}
      {action}
    </div>
  );
}
