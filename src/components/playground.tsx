import { useCallback, useEffect, useMemo, useState } from "react";
import { MAX_BATCH_SIZE } from "@/lib/jev/core/constants";
import type { EvaluateFailure, JudgmentResult } from "@/lib/jev/core/types";
import { formatMs } from "@/lib/jev/core/format";
import { evaluateInput, evaluateBatch, type PlaygroundConfig } from "@/lib/client/api";
import type { DecisionProfile } from "@/lib/jev/usecases/support-router/types";
import type { ComparisonJudgment } from "@/lib/jev/usecases/compare-choose/types";
import { COMPARE_CANDIDATE_SETS } from "@/lib/jev/usecases/compare-choose";
import { COMPARE_THRESHOLDS } from "@/lib/jev/usecases/compare-choose/types";
import { SUPPORT_THRESHOLDS } from "@/lib/jev/usecases/support-router/types";
import { TRIAGE_THRESHOLDS } from "@/lib/jev/usecases/content-triage/types";
import type { TriageJudgment } from "@/lib/jev/usecases/content-triage/types";
import { SupportInput } from "./inputs/support-input";
import { CompareInput } from "./inputs/compare-input";
import { TriageInput } from "./inputs/triage-input";
import { splitBatch } from "@/lib/client/triage-batch";
import { SupportResult } from "./results/support-result";
import { CompareResult } from "./results/compare-result";
import { TriageResult, type TriageRow } from "./results/triage-result";
import { DeveloperPanel } from "./developer-panel";
import {
  devPayloadFromSingle,
  type DevPayload,
} from "@/lib/client/dev-payload";
import { ThemeToggle } from "./theme-toggle";
import { Switch } from "./ui/switch";
import { cn } from "@/lib/utils";

type Stats = { count: number; totalMs: number; lastMs: number | null };
const STATS_KEY = "jev-playground-stats";

function emptyStats(): Stats {
  return { count: 0, totalMs: 0, lastMs: null };
}

function loadStats(): Stats {
  if (typeof sessionStorage === "undefined") return emptyStats();
  try {
    const raw = sessionStorage.getItem(STATS_KEY);
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw) as Partial<Stats>;
    return {
      count: typeof parsed.count === "number" ? parsed.count : 0,
      totalMs: typeof parsed.totalMs === "number" ? parsed.totalMs : 0,
      lastMs: typeof parsed.lastMs === "number" ? parsed.lastMs : null,
    };
  } catch {
    return emptyStats();
  }
}

function saveStats(stats: Stats) {
  try {
    sessionStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* ignore quota */
  }
}

type CompareItem = {
  key: string;
  name: string;
  description: string;
};

type CompareOutcome = {
  items: Array<{ input: { request: string; name: string; description: string }; result: JudgmentResult<ComparisonJudgment> | EvaluateFailure }>;
  totalMs: number;
};

export function Playground({ config }: { config: PlaygroundConfig }) {
  const [activeId, setActiveId] = useState(config.useCases[0]?.id ?? "support-router");
  const [developerView, setDeveloperView] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [devPayload, setDevPayload] = useState<DevPayload | null>(null);

  // support-router
  const [supportMessage, setSupportMessage] = useState("");
  const [supportResult, setSupportResult] = useState<JudgmentResult<DecisionProfile> | EvaluateFailure | null>(null);

  // compare-choose
  const [compareRequest, setCompareRequest] = useState("");
  const [compareCandidates, setCompareCandidates] = useState<CompareItem[]>([
    { key: "candidate-1", name: "", description: "" },
    { key: "candidate-2", name: "", description: "" },
  ]);
  const [compareOutcome, setCompareOutcome] = useState<CompareOutcome | null>(null);

  // content-triage
  const [triageMessage, setTriageMessage] = useState("");
  const [triageBatchMode, setTriageBatchMode] = useState(false);
  const [triageBatchText, setTriageBatchText] = useState("");
  const [triageRows, setTriageRows] = useState<TriageRow[] | null>(null);
  const [triageTotalMs, setTriageTotalMs] = useState<number | null>(null);

  useEffect(() => setStats(loadStats()), []);

  const activeUseCase = useMemo(
    () => config.useCases.find((useCase) => useCase.id === activeId) ?? config.useCases[0],
    [config, activeId],
  );

  const recordStats = useCallback((elapsed: number) => {
    setStats((current) => {
      const next = {
        count: current.count + 1,
        totalMs: current.totalMs + elapsed,
        lastMs: elapsed,
      };
      saveStats(next);
      return next;
    });
  }, []);

  const averageMs = stats.count === 0 ? null : stats.totalMs / stats.count;
  const connected = config.connection.status === "connected";

  function switchUseCase(id: string) {
    if (analyzing) return;
    setActiveId(id);
    setDevPayload(null);
  }

  async function runSupport() {
    if (analyzing) return;
    setAnalyzing(true);
    const started = performance.now();
    try {
      const result = await evaluateInput<DecisionProfile>("support-router", supportMessage.trim());
      setSupportResult(result);
      setDevPayload(devPayloadFromSingle("support-router", SUPPORT_THRESHOLDS, result));
      recordStats(performance.now() - started);
    } catch {
      setSupportResult({
        ok: false,
        code: "network",
        message: "Jev evaluation unavailable.",
        detail: "The analysis request did not complete.",
      });
    } finally {
      setAnalyzing(false);
    }
  }

  async function runCompare() {
    if (analyzing) return;
    const ready = compareCandidates.filter((c) => c.name.trim() && c.description.trim());
    if (!compareRequest.trim() || ready.length === 0) return;
    setAnalyzing(true);
    const started = performance.now();
    const inputs = ready.map((c) => ({
      request: compareRequest.trim(),
      name: c.name.trim(),
      description: c.description.trim(),
    }));
    try {
      const results = await Promise.all(
        inputs.map((input) =>
          evaluateInput<ComparisonJudgment>("compare-choose", input),
        ),
      );
      const items = results.map((result, index) => ({ input: inputs[index], result }));
      setCompareOutcome({ items, totalMs: performance.now() - started });
      const first = results.find((r) => r.ok);
      setDevPayload(
        first
          ? devPayloadFromSingle("compare-choose", COMPARE_THRESHOLDS, first)
          : devPayloadFromSingle("compare-choose", COMPARE_THRESHOLDS, results[0]),
      );
      recordStats(performance.now() - started);
    } catch {
      setCompareOutcome({
        items: inputs.map((input) => ({
          input,
          result: {
            ok: false,
            code: "network",
            message: "Jev evaluation unavailable.",
            detail: "The analysis request did not complete.",
          } as EvaluateFailure,
        })),
        totalMs: performance.now() - started,
      });
    } finally {
      setAnalyzing(false);
    }
  }

  async function runTriage() {
    if (analyzing) return;
    const started = performance.now();
    try {
      if (triageBatchMode) {
        const messages = splitBatch(triageBatchText).slice(0, MAX_BATCH_SIZE);
        if (messages.length === 0) return;
        const batch = await evaluateBatch<TriageJudgment>(
          "content-triage",
          messages.map((message) => ({ message })),
        );
        if (batch.ok) {
          setTriageRows(
            batch.results.map((item, index) =>
              item.ok
                ? {
                    message: messages[index],
                    judgment: item.judgment,
                    latencyMs: item.latencyMs,
                  }
                : { message: messages[index], judgment: null, error: item.detail },
            ),
          );
          setTriageTotalMs(performance.now() - started);
          const first = batch.results.find((r) => r.ok);
          if (first) setDevPayload(devPayloadFromSingle("content-triage", TRIAGE_THRESHOLDS, first));
          recordStats(performance.now() - started);
        } else {
          setTriageRows([{ message: "", judgment: null, error: batch.detail }]);
        }
      } else {
        if (!triageMessage.trim()) return;
        const result = await evaluateInput<TriageJudgment>(
          "content-triage",
          { message: triageMessage.trim() },
        );
        setTriageTotalMs(performance.now() - started);
        setTriageRows(
          result.ok
            ? [{ message: triageMessage.trim(), judgment: result.judgment, latencyMs: result.latencyMs }]
            : [{ message: triageMessage.trim(), judgment: null, error: result.detail }],
        );
        setDevPayload(devPayloadFromSingle("content-triage", TRIAGE_THRESHOLDS, result));
        recordStats(performance.now() - started);
      }
    } catch {
      setTriageRows([
        { message: "", judgment: null, error: "The analysis request did not complete." },
      ]);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="shrink-0 border-b border-border">
        <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="min-w-0">
            <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground sm:text-kicker">TypeSafe · System One</p>
            <h1 className="mt-1 text-base font-medium tracking-tight sm:text-lg">JEV PLAYGROUND</h1>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
            <StatusIndicator connected={connected} />
            <div className="flex items-center gap-2">
              <span className="text-[0.6875rem] text-muted-foreground sm:text-xs">Developer view</span>
              <Switch
                checked={developerView}
                onCheckedChange={setDeveloperView}
                aria-label="Developer view"
              />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 pb-10 sm:px-5 sm:pb-12 lg:px-8">
        <section className="pt-6 sm:pt-8">
          <h2 className="max-w-2xl text-xl font-medium leading-tight tracking-tight text-foreground sm:text-2xl">
            Messy real-world input in. Fast, typed judgments out — that application code can act on.
          </h2>
          <p className="mt-2 max-w-2xl text-[0.8125rem] leading-relaxed text-muted-foreground sm:text-sm">
            Jev answers narrow, typed questions (Choice, Score, Noul) with calibrated
            probabilities. Every threshold, route, and explanation below is computed by this
            application from those judgments — probabilities guide workflow, they do not
            guarantee truth.
          </p>
        </section>

        <nav aria-label="Use cases" className="mt-5 flex w-full min-w-0 flex-wrap gap-1.5 sm:mt-6">
          {config.useCases.map((useCase) => (
            <button
              key={useCase.id}
              type="button"
              onClick={() => switchUseCase(useCase.id)}
              aria-pressed={useCase.id === activeId}
              className={cn(
                "min-h-10 max-w-full rounded-md px-3 text-sm transition-[background-color,box-shadow,color] duration-150 ease-out sm:px-4",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                useCase.id === activeId
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground shadow-[0_0_0_1px_var(--color-border)] hover:bg-muted hover:text-foreground",
              )}
            >
              {useCase.title}
            </button>
          ))}
        </nav>
        {activeUseCase ? (
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {activeUseCase.shortDescription}
          </p>
        ) : null}

        <div className="mt-5 grid min-w-0 gap-5 lg:mt-6 lg:grid-cols-2 lg:gap-6">
          <section aria-label="Input" className="min-w-0">
            <div className="min-w-0 rounded-lg bg-card p-4 shadow-[0_0_0_1px_var(--color-border)] sm:p-5">
              {activeId === "support-router" ? (
                <SupportInput
                  message={supportMessage}
                  onMessageChange={setSupportMessage}
                  examples={activeUseCase?.examples ?? []}
                  analyzing={analyzing}
                  onSubmit={runSupport}
                />
              ) : activeId === "compare-choose" ? (
                <CompareInput
                  request={compareRequest}
                  candidates={compareCandidates}
                  onRequestChange={setCompareRequest}
                  onCandidateChange={(key, patch) =>
                    setCompareCandidates((current) =>
                      current.map((c) => (c.key === key ? { ...c, ...patch } : c)),
                    )
                  }
                  onCandidateRemove={(key) =>
                    setCompareCandidates((current) => current.filter((c) => c.key !== key))
                  }
                  onCandidateAdd={() =>
                    setCompareCandidates((current) => [
                      ...current,
                      { key: `c-${Date.now()}`, name: "", description: "" },
                    ])
                  }
                  onLoadExample={() => {
                    const set = COMPARE_CANDIDATE_SETS[0];
                    if (!set) return;
                    setCompareRequest(set.request);
                    setCompareCandidates(
                      set.candidates.map((c, i) => ({
                        key: `ex-${i}-${Date.now()}`,
                        name: c.name,
                        description: c.description,
                      })),
                    );
                  }}
                  analyzing={analyzing}
                  onSubmit={runCompare}
                />
              ) : (
                <TriageInput
                  message={triageMessage}
                  onMessageChange={setTriageMessage}
                  batchMode={triageBatchMode}
                  onBatchModeChange={setTriageBatchMode}
                  batchText={triageBatchText}
                  onBatchTextChange={setTriageBatchText}
                  examples={activeUseCase?.examples ?? []}
                  analyzing={analyzing}
                  maxBatchSize={MAX_BATCH_SIZE}
                  onSubmit={runTriage}
                />
              )}
            </div>
          </section>

          <section aria-label="Result" aria-busy={analyzing} aria-live="polite" className="min-w-0">
            <div className="rounded-lg bg-card p-5 shadow-[0_0_0_1px_var(--color-border)]">
              <ResultArea
                activeId={activeId}
                analyzing={analyzing}
                connected={connected}
                supportResult={supportResult}
                compareOutcome={compareOutcome}
                triageRows={triageRows}
                triageTotalMs={triageTotalMs}
              />
            </div>
          </section>
        </div>

        {developerView ? (
          <DeveloperPanel payload={devPayload} />
        ) : null}
      </main>

      <footer className="shrink-0 border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 font-mono text-[0.6875rem] tabular-nums text-muted-foreground sm:gap-x-4 sm:px-5 sm:text-xs lg:px-8">
          <span>Requests {stats.count}</span>
          <span aria-hidden="true">·</span>
          <span>Avg {averageMs == null ? "—" : formatMs(averageMs)}</span>
          <span aria-hidden="true">·</span>
          <span>Last {stats.lastMs == null ? "—" : formatMs(stats.lastMs)}</span>
        </div>
      </footer>
    </div>
  );
}

function StatusIndicator({ connected }: { connected: boolean }) {
  return (
    <p className="flex items-center gap-2 text-sm" role="status" aria-live="polite">
      <span
        className={cn("size-1.5 rounded-full", connected ? "bg-success" : "bg-muted-foreground")}
        aria-hidden="true"
      />
      <span className={connected ? "text-foreground" : "text-muted-foreground"}>
        {connected ? "Connected" : "Configuration required"}
      </span>
    </p>
  );
}

function ResultArea({
  activeId,
  analyzing,
  connected,
  supportResult,
  compareOutcome,
  triageRows,
  triageTotalMs,
}: {
  activeId: string;
  analyzing: boolean;
  connected: boolean;
  supportResult: JudgmentResult<DecisionProfile> | EvaluateFailure | null;
  compareOutcome: CompareOutcome | null;
  triageRows: TriageRow[] | null;
  triageTotalMs: number | null;
}) {
  if (analyzing) {
    return (
      <div aria-hidden="true" className="mt-2 border-t border-border">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="border-b border-border py-5">
            <div className="h-3 w-20 bg-muted" />
            <div className="mt-3 h-6 w-40 bg-muted" />
          </div>
        ))}
        <p className="pt-3 text-xs text-muted-foreground">Evaluating with Jev…</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="mt-2 border-t border-border pt-5" role="status">
        <h3 className="text-kicker uppercase text-muted-foreground">Jev not connected</h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Add TYPESAFE_API_KEY to the server environment to enable live analysis. The key is
          read only on the server and is never sent to the browser.
        </p>
      </div>
    );
  }

  if (activeId === "support-router") {
    if (!supportResult) return <EmptyState />;
    if (!supportResult.ok) return <ErrorState failure={supportResult} />;
    return <SupportResult profile={supportResult.judgment} />;
  }

  if (activeId === "compare-choose") {
    if (!compareOutcome) return <EmptyState />;
    return (
      <>
        <CompareResult
          candidates={compareOutcome.items.map((item) =>
            item.result.ok
              ? { judgment: item.result.judgment }
              : { judgment: null, error: item.result.detail },
          )}
        />
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          {compareOutcome.items.length} candidates · {formatMs(compareOutcome.totalMs)} total
        </p>
      </>
    );
  }

  if (!triageRows) return <EmptyState />;
  return (
    <>
      <TriageResult rows={triageRows} />
      {triageTotalMs != null ? (
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          {formatMs(triageTotalMs)} total
        </p>
      ) : null}
    </>
  );
}

function EmptyState() {
  return (
    <div className="mt-2 border-t border-border pt-5">
      <h3 className="text-kicker uppercase text-muted-foreground">Ready</h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Provide an input and run an evaluation. Probabilities, thresholds, and the resulting
        action appear here.
      </p>
    </div>
  );
}

function ErrorState({ failure }: { failure: EvaluateFailure }) {
  return (
    <div className="mt-2 border-t border-border pt-5" role="alert">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-kicker uppercase text-muted-foreground">{failure.message}</h3>
        <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          {failure.code}
        </span>
      </div>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        {failure.detail}
      </p>
    </div>
  );
}
