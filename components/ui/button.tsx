import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: { primary: "bg-white text-slate-950 shadow-[0_8px_30px_rgba(255,255,255,.13)] hover:-translate-y-0.5 hover:bg-cyan-50", ghost: "text-slate-300 hover:bg-white/10 hover:text-white", outline: "border border-white/15 bg-white/[.04] text-white hover:bg-white/10" },
    size: { default: "min-h-11 px-4 text-sm", sm: "min-h-9 px-3 text-xs", lg: "min-h-14 px-5 text-base" },
  }, defaultVariants: { variant: "primary", size: "default" },
});

export function Button({ className, variant, size, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
