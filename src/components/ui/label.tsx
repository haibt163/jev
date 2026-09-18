import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-kicker font-medium tracking-wide text-muted-foreground uppercase",
        className,
      )}
      {...props}
    />
  );
}
