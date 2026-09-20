import { cn } from "@/lib/cn";

/*
  Setiap input punya label eksplisit yang terhubung lewat htmlFor/id, dan pesan
  error dibacakan pembaca layar lewat role="alert" (SRD Bab 11: aksesibilitas).
*/

const controlBase =
  "w-full rounded-[3px] border border-line-strong bg-surface px-3 text-ink placeholder:text-ink-muted/70 disabled:opacity-60";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm leading-snug text-ink-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, "h-11", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlBase, "min-h-24 py-2.5", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlBase, "h-11", className)} {...props} />;
}

export function Checkbox({
  label,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 border border-line bg-surface p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft",
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
        {...props}
      />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint ? <span className="mt-0.5 block text-sm text-ink-muted">{hint}</span> : null}
      </span>
    </label>
  );
}
