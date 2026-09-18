import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-0 w-full flex-1 resize-none rounded-md bg-card px-3.5 py-3 text-composer text-foreground shadow-[0_0_0_1px_var(--color-border)] placeholder:text-muted-foreground/80",
        "transition-[box-shadow] duration-150 ease-out",
        "focus-visible:outline-none focus-visible:shadow-[0_0_0_1px_var(--color-accent)]",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
