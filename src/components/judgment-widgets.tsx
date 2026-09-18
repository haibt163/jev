import { useState, type ReactNode } from "react";
import { formatPct, sortedEntries } from "@/lib/jev/core/format";
import { cn } from "@/lib/utils";

/** Probability distribution across Choice options or Score levels. */
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
    <ul className={cn("min-w-0 space-y-1.5", compact ? "mt-3" : "mt-4")}>
      {rows.map(([key, value]) => {
        const label = labels?.[key] ?? key;
        const active = highlight === key;
        return (
          <li key={key} className="flex min-w-0 items-start gap-2.5 text-xs">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full shadow-[0_0_0_1px_var(--color-border)]",
                active ? "bg-accent shadow-none" : "bg-transparent",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "min-w-0 flex-1 break-words whitespace-normal",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
              {formatPct(value)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Ordered level meter for a Score judgment (0..max). */
export function ScoreMeter({
  score,
  max,
  levelLabels,
}: {
  score: number;
  max: number;
  levelLabels?: string[];
}) {
  const units = max + 1;
  const filled = Math.min(units, Math.max(0, Math.round(score)));
  return (
    <div className="mt-3">
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: units }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-0.5 flex-1 rounded-full",
              index <= filled ? "bg-foreground" : "bg-border",
            )}
          />
        ))}
      </div>
      {levelLabels?.[filled] ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{levelLabels[filled]}</p>
      ) : null}
    </div>
  );
}

/** Probability track for a Noul judgment, with the 0.5 threshold marked. */
export function NoulTrack({ value, threshold = 0.5 }: { value: number; threshold?: number }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className="relative mt-3 h-px bg-border" aria-hidden="true">
      <span
        className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
        style={{ left: `${clamped * 100}%` }}
      />
      <span
        className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-border"
        style={{ left: `${threshold * 100}%` }}
      />
    </div>
  );
}

/** Row shell for one labeled judgment. */
export function ResultRow({
  label,
  primitive,
  value,
  meta,
  confidence,
  last = false,
  children,
}: {
  label: string;
  primitive: string;
  value: ReactNode;
  meta?: string;
  confidence?: number | null;
  last?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className={cn("py-5", !last && "border-b border-border")}>
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-kicker uppercase text-muted-foreground">{label}</h3>
        <span className="rounded-sm px-1.5 py-0.5 text-kicker uppercase text-muted-foreground shadow-[0_0_0_1px_var(--color-border)]">
          {primitive}
        </span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p className="text-xl font-medium tracking-tight text-foreground">{value}</p>
        {meta ? (
          <p className="font-mono text-sm tabular-nums text-muted-foreground">{meta}</p>
        ) : null}
      </div>
      {children}
      {confidence != null ? (
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Confidence {formatPct(confidence)}
        </p>
      ) : null}
    </section>
  );
}

/** Copy-to-clipboard button with transient confirmation. */
export function CopyButton({ value, label = "Copy" }: { value: unknown; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="text-kicker uppercase tracking-wide text-muted-foreground transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      onClick={() => {
        const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}