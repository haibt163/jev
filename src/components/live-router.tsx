import { useEffect, useId, useMemo, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { EXAMPLES, MAX_MESSAGE_LENGTH } from "@/lib/jev/catalog";
import { formatMs } from "@/lib/jev/format";
import { JEV_UNAVAILABLE, type AnalyzeResponse } from "@/lib/jev/types";
import { cn } from "@/lib/utils";
import { DecisionPanel } from "./decision-panel";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";

type ExperimentStats = {
  count: number;
  totalMs: number;
  lastMs: number | null;
  lastModel: string | null;
};

const STATS_KEY = "jev-live-router-experiment";

function emptyStats(): ExperimentStats {
  return { count: 0, totalMs: 0, lastMs: null, lastModel: null };
}

function loadStats(): ExperimentStats {
  if (typeof sessionStorage === "undefined") return emptyStats();
  try {
    const raw = sessionStorage.getItem(STATS_KEY);
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw) as Partial<ExperimentStats>;
    return {
      count: typeof parsed.count === "number" ? parsed.count : 0,
      totalMs: typeof parsed.totalMs === "number" ? parsed.totalMs : 0,
      lastMs: typeof parsed.lastMs === "number" ? parsed.lastMs : null,
      lastModel: typeof parsed.lastModel === "string" ? parsed.lastModel : null,
    };
  } catch {
    return emptyStats();
  }
}

function saveStats(stats: ExperimentStats) {
  try {
    sessionStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* ignore quota */
  }
}

export function LiveRouter({
  configured,
  status,
}: {
  configured: boolean;
  status: "connected" | "missing_key";
}) {
  const messageId = useId();
  const developerId = useId();
  const [message, setMessage] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [clientMs, setClientMs] = useState<number | null>(null);
  const [developerView, setDeveloperView] = useState(false);
  const [stats, setStats] = useState<ExperimentStats>(emptyStats);

  useEffect(() => {
    setStats(loadStats());
  }, []);

  const averageMs = useMemo(() => {
    if (stats.count === 0) return null;
    return stats.totalMs / stats.count;
  }, [stats]);

  const selectedExample = EXAMPLES.find((example) => example.text === message);

  async function analyze() {
    const text = message.trim();
    if (!text || analyzing) return;

    setAnalyzing(true);
    const started = performance.now();
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_message: text }),
      });
      const elapsed = performance.now() - started;
      setClientMs(elapsed);
      const payload = (await response.json()) as AnalyzeResponse;
      setResult(payload);

      const model = payload.ok
        ? payload.model
        : payload.model
          ? payload.model
          : stats.lastModel;
      const next: ExperimentStats = {
        count: stats.count + 1,
        totalMs: stats.totalMs + elapsed,
        lastMs: elapsed,
        lastModel: model,
      };
      setStats(next);
      saveStats(next);
    } catch {
      const elapsed = performance.now() - started;
      setClientMs(elapsed);
      setResult({
        ok: false,
        code: "network",
        message: JEV_UNAVAILABLE,
        detail: "The analysis request did not complete.",
        latencyMs: elapsed,
      });
      const next: ExperimentStats = {
        count: stats.count + 1,
        totalMs: stats.totalMs + elapsed,
        lastMs: elapsed,
        lastModel: stats.lastModel,
      };
      setStats(next);
      saveStats(next);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="shrink-0 border-b border-border">
        <div className="flex flex-col gap-3 px-5 py-3 lg:flex-row lg:items-start lg:justify-between lg:px-6">
          <div className="min-w-0">
            <p className="text-kicker uppercase text-muted-foreground">
              TypeSafe · System One
            </p>
            <h1 className="mt-1 text-lg font-medium tracking-tight text-foreground">
              JEV LIVE ROUTER
            </h1>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              Turn natural-language requests into structured decisions.
            </p>
          </div>

          <div className="flex flex-col gap-2 lg:items-end">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <StatusIndicator status={status} />
              <div className="flex items-center gap-2">
                <Label
                  htmlFor={developerId}
                  className="normal-case tracking-normal text-muted-foreground"
                >
                  Developer view
                </Label>
                <Switch
                  id={developerId}
                  checked={developerView}
                  onCheckedChange={setDeveloperView}
                  aria-label="Developer view"
                />
              </div>
              <ThemeToggle />
            </div>
            <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-muted-foreground">
              <Stat label="Requests" value={String(stats.count)} />
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <Stat
                label="Avg"
                value={averageMs == null ? "—" : formatMs(averageMs)}
              />
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <Stat
                label="Last"
                value={stats.lastMs == null ? "—" : formatMs(stats.lastMs)}
              />
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <Stat label="Model" value={stats.lastModel ?? "—"} />
            </dl>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-2 lg:grid-rows-1 lg:overflow-hidden">
        <section className="flex min-h-0 flex-col border-b border-border p-5 lg:h-full lg:border-r lg:border-b-0 lg:p-6">
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              void analyze();
            }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor={messageId}>Request</Label>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {message.length} / {MAX_MESSAGE_LENGTH}
              </span>
            </div>
            <div className="relative mt-2 min-h-52 flex-1">
              <Textarea
                id={messageId}
                name="user_message"
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value.slice(0, MAX_MESSAGE_LENGTH))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    void analyze();
                  }
                }}
                placeholder="Describe a request in any words…"
                className="absolute inset-0 h-full min-h-52"
                disabled={analyzing}
              />
            </div>
            <div className="mt-4 flex shrink-0 flex-wrap items-center gap-3">
              <Button
                type="submit"
                size="lg"
                disabled={analyzing || !message.trim()}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Analyzing with Jev…
                  </>
                ) : (
                  <>
                    Analyze with Jev
                    <ArrowRight />
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                Ctrl / ⌘ + Enter
              </span>
            </div>
          </form>

          <section className="mt-6 shrink-0" aria-label="Example requests">
            <h2 className="text-kicker uppercase text-muted-foreground">
              Example requests
            </h2>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {EXAMPLES.map((example) => {
                const selected = message === example.text;
                return (
                  <li key={example.id}>
                    <button
                      type="button"
                      title={example.text}
                      onClick={() => setMessage(example.text)}
                      className={cn(
                        "min-h-11 rounded-md px-3 text-sm transition-[background-color,box-shadow,color] duration-150 ease-out lg:min-h-8",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                        selected
                          ? "bg-muted text-foreground shadow-[0_0_0_1px_var(--color-accent)]"
                          : "text-muted-foreground shadow-[0_0_0_1px_var(--color-border)] hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {example.label}
                    </button>
                  </li>
                );
              })}
            </ul>
            {selectedExample ? (
              <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
                {selectedExample.text}
              </p>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Examples fill the composer. They do not call Jev.
              </p>
            )}
          </section>
        </section>

        <section className="flex min-h-0 flex-col overflow-y-auto p-5 lg:p-6">
          <DecisionPanel
            result={result}
            clientMs={clientMs}
            analyzing={analyzing}
            developerView={developerView}
            configured={configured}
          />
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-1.5">
      <dt>{label}</dt>
      <dd className="truncate text-foreground">{value}</dd>
    </div>
  );
}

function StatusIndicator({
  status,
}: {
  status: "connected" | "missing_key";
}) {
  const connected = status === "connected";
  return (
    <p
      className="flex items-center gap-2 text-sm"
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          connected ? "bg-success" : "bg-muted-foreground",
        )}
        aria-hidden="true"
      />
      <span className={connected ? "text-foreground" : "text-muted-foreground"}>
        {connected ? "Connected" : "Configuration required"}
      </span>
    </p>
  );
}
