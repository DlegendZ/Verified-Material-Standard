import { cn } from "@/lib/cn";

export function Panel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-line bg-surface",
        className,
      )}
      {...props}
    />
  );
}

export function PanelHeader({
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
        "flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description ? (
          <p className="mt-0.5 max-w-prose text-sm text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function PanelBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 py-4 sm:px-5", className)} {...props} />;
}

/** Baris data label → nilai. Nilai terukur pakai font mono supaya sejajar. */
export function DataRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-b-0">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd
        className={cn(
          "text-right text-sm font-medium text-ink",
          mono && "font-mono tabular",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function DataList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDListElement>) {
  return <dl className={cn("divide-y-0", className)} {...props} />;
}
