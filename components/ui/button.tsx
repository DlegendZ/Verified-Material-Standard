import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/*
  Tombol dibentuk seperti tombol alat ukur: sudut hampir siku, tanpa bayangan,
  tinggi minimal 44px di ukuran default supaya nyaman dipakai grader satu tangan.
*/
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[3px] border font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-brand bg-brand text-brand-ink hover:bg-brand-hover hover:border-brand-hover",
        outline: "border-line-strong bg-surface text-ink hover:bg-surface-sunken",
        ghost: "border-transparent bg-transparent text-ink hover:bg-surface-sunken",
        danger: "border-danger bg-danger text-white hover:opacity-90 dark:text-[#2a1a18]",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        block: "h-12 w-full px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
