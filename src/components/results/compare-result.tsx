import type { ComparisonJudgment } from "@/lib/jev/usecases/compare-choose/types";
import { deriveCandidateVerdict } from "@/lib/jev/usecases/compare-choose/rules";
import { CRITERION_IDS, CRITERION_WEIGHTS } from "@/lib/jev/usecases/compare-choose/types";
import { formatPct } from "@/lib/jev/core/format";
import { cn } from "@/lib/utils";

const CRITERION_LABELS: Record<string, string> = {
  portability: "Portability",
  performance: "Performance",
  battery: "Battery",
  value: "Value",
  fit: "Fit",
};

/**
 * Deterministic comparison computed in application code from typed
 * judgments. The composite is a weighted sum of normalized Score
 * positions — an application metric, never a Jev output.
 */
export function CompareResult({
  candidates,
}: {
  candidates: Array<{ judgment: ComparisonJudgment | null; error?: string }>;
}) {
  const ranked = [...candidates].sort((a, b) => {
    const av = a.judgment ? a.judgment.composite : -1;
    const bv = b.judgment ? b.judgment.composite : -1;
    return bv - av;
  });

  return (
    <div className="lab-in border-t border-border">
      <p className="py-4 text-xs leading-relaxed text-muted-foreground">
        Weights (set in application code):{" "}
        {CRITERION_IDS.map((id) => `${CRITERION_LABELS[id]} ${Math.round(CRITERION_WEIGHTS[id] * 100)}%`).join(" · ")}
      </p>
      <ol className="space-y-3">
        {ranked.map((candidate, index) => (
          <li key={candidate.judgment?.name ?? index}>
            <CandidateCard rank={index + 1} candidate={candidate} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function CandidateCard({
  rank,
  candidate,
}: {
  rank: number;
  candidate: { judgment: ComparisonJudgment | null; error?: string };
}) {
  if (!candidate.judgment) {
    return (
      <div className="rounded-md bg-card p-4 shadow-[0_0_0_1px_var(--color-border)]">
        <p className="text-sm text-destructive">{candidate.error ?? "Evaluation failed."}</p>
      </div>
    );
  }

  const judgment = candidate.judgment;
  const verdict = deriveCandidateVerdict(judgment);

  return (
    <div className="rounded-md bg-card p-4 shadow-[0_0_0_1px_var(--color-border)]">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">#{rank}</p>
          <p className="truncate text-lg font-medium tracking-tight text-foreground">
            {judgment.name}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xl tabular-nums text-foreground">
            {Math.round(judgment.composite * 100)}
          </p>
          <p className="text-kicker uppercase text-muted-foreground">composite</p>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${Math.round(judgment.composite * 100)}%` }}
        />
      </div>

      <dl className="mt-4 grid grid-cols-5 gap-2">
        {CRITERION_IDS.map((id) => (
          <div key={id} className="min-w-0">
            <dt className="truncate text-kicker uppercase text-muted-foreground">
              {CRITERION_LABELS[id]}
            </dt>
            <dd className="mt-1 font-mono text-sm tabular-nums text-foreground">
              {Math.round(judgment.normalized[id] * 100)}
            </dd>
            <div className="mt-1 h-0.5 rounded-full bg-border" aria-hidden="true">
              <div
                className={cn(
                  "h-full rounded-full",
                  id === verdict.strongest ? "bg-accent" : "bg-muted-foreground/60",
                )}
                style={{ width: `${Math.round(judgment.normalized[id] * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{verdict.explanation}</p>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
        {verdict.action === "needs_info" ? (
          <span className="text-warning">
            Needs info · {formatPct(judgment.needsInfo.noul)}
          </span>
        ) : null}
        {judgment.confidence != null ? (
          <span>mean confidence {formatPct(judgment.confidence)}</span>
        ) : (
          <span>confidence n/a</span>
        )}
        <span>
          strongest {CRITERION_LABELS[verdict.strongest]} · weakest {CRITERION_LABELS[verdict.weakest]}
        </span>
      </div>
    </div>
  );
}
