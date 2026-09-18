import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full min-w-0 rounded-md bg-card px-3 text-sm text-foreground shadow-[0_0_0_1px_var(--color-border)] placeholder:text-muted-foreground/80",
        "transition-[box-shadow] duration-150 ease-out",
        "focus-visible:outline-none focus-visible:shadow-[0_0_0_1px_var(--color-accent)]",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
