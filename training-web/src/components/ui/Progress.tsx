import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number; // 0–100
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}

export default function Progress({ value, size = "sm", showLabel, className, ...props }: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const heights = { xs: "h-0.5", sm: "h-1", md: "h-2" };
  return (
    <div className={cn("flex items-center gap-3", className)} {...props}>
      <div className={cn("flex-1 rounded-full bg-white/10 overflow-hidden", heights[size])}>
        <div
          className="h-full rounded-full bg-white transition-all duration-500 ease-out"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-white/50 w-10 text-right flex-shrink-0">
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}
