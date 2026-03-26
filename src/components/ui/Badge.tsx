import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "beginner" | "intermediate" | "advanced" | "success" | "warning" | "error";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-white/10 text-white/80 border border-white/10",
  beginner: "bg-emerald-950 text-emerald-400 border border-emerald-900",
  intermediate: "bg-amber-950 text-amber-400 border border-amber-900",
  advanced: "bg-red-950 text-red-400 border border-red-900",
  success: "bg-emerald-950 text-emerald-400 border border-emerald-900",
  warning: "bg-amber-950 text-amber-400 border border-amber-900",
  error: "bg-red-950 text-red-400 border border-red-900",
};

export default function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
