import { formatPct, sortedEntries } from "@/lib/jev/format";
import { cn } from "@/lib/utils";

export function Distribution({
  values,
  labels,
  highlight,
  compact = false,
}: {
  values: Record<string, number>;
  labels?: Record<string, string>;
  highlight?: string;
  compact?: boolean;
}) {
  const rows = sortedEntries(values);
  if (rows.length === 0) return null;

  return (
    <ul className={cn("space-y-1.5", compact ? "mt-3" : "mt-4")}>
      {rows.map(([key, value]) => {
        const label = labels?.[key] ?? key;
        const active = highlight === key;
        return (
          <li
            key={key}
            className="flex items-center gap-2.5 text-xs"
          >
            <span
              className={cn(
                "size-2 shrink-0 rounded-full shadow-[0_0_0_1px_var(--color-border)]",
                active ? "bg-accent shadow-none" : "bg-transparent",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {formatPct(value)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
