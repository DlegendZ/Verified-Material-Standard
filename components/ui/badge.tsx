import { cn } from "@/lib/cn";

type Tone = "neutral" | "ok" | "warning" | "danger" | "brand";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "border-line-strong bg-surface-sunken text-ink-muted",
  ok: "border-ok bg-ok-soft text-ok",
  warning: "border-warning bg-warning-soft text-warning",
  danger: "border-danger bg-danger-soft text-danger",
  brand: "border-brand bg-brand-soft text-brand",
};

/**
 * Status tidak pernah disampaikan lewat warna saja — teksnya selalu ikut,
 * supaya terbaca oleh pengguna dengan gangguan penglihatan warna.
 */
export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] border px-2 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export type { Tone };
