import { useMemo, useState } from "react";
import type { TriageJudgment } from "@/lib/jev/usecases/content-triage/types";
import { deriveTriageWorkflow } from "@/lib/jev/usecases/content-triage/rules";
import type { TriageAction } from "@/lib/jev/usecases/content-triage/rules";
import { formatPct, formatScore } from "@/lib/jev/core/format";
import { Distribution, NoulTrack } from "../judgment-widgets";
import { cn } from "@/lib/utils";

export type TriageRow = {
  message: string;
  judgment: TriageJudgment | null;
  error?: string;
  latencyMs?: number;
};

const ACTION_LABELS: Record<TriageAction, string> = {
  reply: "Reply",
  forward_support: "Forward to support",
  archive: "Archive",
  flag_review: "Flag for review",
};

/**
 * Batch results with deterministic sort and filters. Ranking by priority is
 * a sort over a typed Score judgment — application logic, not an objective
 * universal ranking.
 */
export function TriageResult({ rows }: { rows: TriageRow[] }) {
  const [onlyReview, setOnlyReview] = useState(false);
  const [sortByPriority, setSortByPriority] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible = useMemo(() => {
    let list = rows.filter((row) => row.judgment != null || !onlyReview);
    if (onlyReview) {
      list = list.filter((row) => row.judgment?.reviewNeeded.flagged);
    }
    if (sortByPriority) {
      list = [...list].sort(
        (a, b) => (b.judgment?.priority.score ?? -1) - (a.judgment?.priority.score ?? -1),
      );
    }
    return list;
  }, [rows, onlyReview, sortByPriority]);

  const flaggedCount = rows.filter((row) => row.judgment?.reviewNeeded.flagged).length;

  return (
    <div className="lab-in border-t border-border">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-4">
        <p className="font-mono text-xs text-muted-foreground">
          {rows.length} items · {flaggedCount} flagged for review
        </p>
        <button
          type="button"
          onClick={() => setOnlyReview((v) => !v)}
          aria-pressed={onlyReview}
          className={cn(
            "rounded-sm px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            onlyReview
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground shadow-[0_0_0_1px_var(--color-border)] hover:bg-muted",
          )}
        >
          Review-needed only
        </button>
        <button
          type="button"
          onClick={() => setSortByPriority((v) => !v)}
          aria-pressed={sortByPriority}
          className={cn(
            "rounded-sm px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            sortByPriority
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground shadow-[0_0_0_1px_var(--color-border)] hover:bg-muted",
          )}
        >
          Sort by priority
        </button>
      </div>

      <ul className="space-y-2">
        {visible.map((row, index) => (
          <TriageRowCard
            key={`${index}-${row.message.slice(0, 24)}`}
            row={row}
            expanded={expanded === `${index}-${row.message.slice(0, 24)}`}
            onToggle={() =>
              setExpanded((current) =>
                current === `${index}-${row.message.slice(0, 24)}` ? null : `${index}-${row.message.slice(0, 24)}`,
              )
            }
          />
        ))}
        {visible.length === 0 ? (
          <li className="rounded-md bg-card p-4 text-sm text-muted-foreground shadow-[0_0_0_1px_var(--color-border)]">
            No items match the current filters.
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function TriageRowCard({
  row,
  expanded,
  onToggle,
}: {
  row: TriageRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!row.judgment) {
    return (
      <li className="rounded-md bg-card p-3 shadow-[0_0_0_1px_var(--color-border)]">
        <p className="truncate text-sm text-muted-foreground">{row.message}</p>
        <p className="mt-1 text-xs text-destructive">{row.error ?? "Evaluation failed."}</p>
      </li>
    );
  }

  const judgment = row.judgment;
  const workflow = deriveTriageWorkflow(judgment);

  return (
    <li className="rounded-md bg-card shadow-[0_0_0_1px_var(--color-border)]">
      <div className="flex items-start gap-3 p-3">
        <span
          className={cn(
            "mt-1 size-2 shrink-0 rounded-full",
            workflow.action === "flag_review" ? "bg-warning" : "bg-accent",
          )}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-foreground" title={row.message}>
            {row.message}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
            <span className="text-foreground">{judgment.category.label}</span>
            <span>prio {formatScore(judgment.priority.score)}/{judgment.priority.max}</span>
            <span>{ACTION_LABELS[workflow.action]}</span>
            {judgment.reviewNeeded.flagged ? (
              <span className="text-warning">review {formatPct(judgment.reviewNeeded.noul)}</span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="shrink-0 px-2 py-1 text-xs text-muted-foreground transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {expanded ? "Hide" : "Details"}
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-border px-3 pb-3 pt-2">
          <p className="text-xs leading-relaxed text-muted-foreground">{workflow.explanation}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-kicker uppercase text-muted-foreground">Category</p>
              <Distribution
                values={judgment.category.probabilities}
                labels={Object.fromEntries(
                  Object.keys(judgment.category.probabilities).map((key) => [
                    key,
                    key === judgment.category.choice ? judgment.category.label : key,
                  ]),
                )}
                highlight={judgment.category.choice}
                compact
              />
            </div>
            <div>
              <p className="text-kicker uppercase text-muted-foreground">Priority levels</p>
              <Distribution
                values={judgment.priority.probabilities}
                labels={judgment.priority.legend}
                highlight={String(Math.round(judgment.priority.score))}
                compact
              />
              <p className="mt-2 text-kicker uppercase text-muted-foreground">Review needed</p>
              <NoulTrack value={judgment.reviewNeeded.noul} />
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {formatPct(judgment.reviewNeeded.noul)} · threshold 50%
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}
