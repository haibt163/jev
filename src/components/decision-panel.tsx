import { useState, type ReactNode } from "react";
import { actionLabel, intentLabel, MAX_URGENCY_LEVEL } from "@/lib/jev/catalog";
import {
  formatMs,
  formatPct,
  formatProb,
  formatScore,
  yesNo,
} from "@/lib/jev/format";
import { JEV_MODEL, JEV_QUESTIONS } from "@/lib/jev/questions";
import type { AnalyzeResponse, DecisionProfile } from "@/lib/jev/types";
import { cn } from "@/lib/utils";
import { Distribution } from "./distribution";

type Props = {
  result: AnalyzeResponse | null;
  clientMs: number | null;
  analyzing: boolean;
  developerView: boolean;
  configured: boolean;
};

export function DecisionPanel({
  result,
  clientMs,
  analyzing,
  developerView,
  configured,
}: Props) {
  const success = result?.ok ? result : null;
  const failure = result && !result.ok ? result : null;
  const showSetup =
    (!result && !configured) || failure?.code === "missing_api_key";
  const showError = Boolean(failure) && failure?.code !== "missing_api_key";
  const profile = success?.profile ?? null;

  const title = analyzing && !profile
    ? "Evaluating…"
    : showSetup
      ? "Jev not connected"
      : showError
        ? failure?.message ?? "Jev evaluation unavailable."
        : profile
          ? "Structured decision"
          : "Ready";

  return (
    <div
      className={cn("flex min-h-full flex-col", analyzing && profile && "opacity-60")}
      aria-busy={analyzing}
      aria-live="polite"
    >
      <Header kicker="Jev assessment" title={title} />
      <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
        Probabilities represent Jev's judgment, not guaranteed truth.
      </p>

      {showSetup ? <SetupNote /> : null}
      {showError && failure ? (
        <ErrorNote result={failure} clientMs={clientMs} />
      ) : null}

      {profile?.warnings.length ? (
        <p className="mt-4 text-xs text-warning">{profile.warnings.join(" ")}</p>
      ) : null}

      {analyzing && !profile ? <LoadingRows /> : null}
      {profile ? <ResultRows profile={profile} /> : null}

      {success ? (
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-4 font-mono text-xs text-muted-foreground">
          {clientMs != null ? <p>Jev response {formatMs(clientMs)}</p> : null}
          <p>TypeSafe call {formatMs(success.latencyMs)}</p>
          {success.model ? <p>Model {success.model}</p> : null}
        </div>
      ) : null}

      {developerView ? (
        <DeveloperPanel result={result} clientMs={clientMs} />
      ) : null}
    </div>
  );
}

function Header({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <p className="text-kicker uppercase text-muted-foreground">{kicker}</p>
      <h2 className="mt-2 text-xl font-medium tracking-tight text-foreground">
        {title}
      </h2>
    </div>
  );
}

function SetupNote() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6 max-w-md" role="status">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Add TYPESAFE_API_KEY to the server environment to enable live analysis.
      </p>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="mt-3 min-h-11 text-sm text-foreground transition-opacity duration-150 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        Deployment settings →
      </button>
      {open ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Set TYPESAFE_API_KEY in the app deployment environment, then republish.
          The key is read only on the server and is never sent to the browser.
        </p>
      ) : null}
    </div>
  );
}

function ErrorNote({
  result,
  clientMs,
}: {
  result: Extract<AnalyzeResponse, { ok: false }>;
  clientMs: number | null;
}) {
  return (
    <div className="mt-6 max-w-md" role="alert" aria-live="assertive">
      <p className="text-sm leading-relaxed text-muted-foreground">{result.detail}</p>
      {clientMs != null ? (
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Jev response {formatMs(clientMs)}
        </p>
      ) : null}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="mt-8 border-t border-border" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="border-b border-border py-5">
          <div className="h-3 w-20 bg-muted" />
          <div className="mt-3 h-6 w-40 bg-muted" />
        </div>
      ))}
    </div>
  );
}

function ResultRows({ profile }: { profile: DecisionProfile }) {
  const intentPct = profile.intent.probabilities[profile.intent.choice];
  const actionPct = profile.action.probabilities[profile.action.choice];

  return (
    <div className="lab-in mt-8 border-t border-border">
      <ResultRow
        label="Intent"
        primitive="Choice"
        value={profile.intent.label}
        meta={intentPct != null ? formatPct(intentPct) : undefined}
        confidence={profile.intent.confidence}
      >
        <Distribution
          compact
          values={profile.intent.probabilities}
          labels={Object.fromEntries(
            Object.keys(profile.intent.probabilities).map((key) => [
              key,
              intentLabel(key),
            ]),
          )}
          highlight={profile.intent.choice}
        />
      </ResultRow>

      <ResultRow
        label="Recommended action"
        primitive="Choice"
        value={profile.action.label}
        meta={actionPct != null ? formatPct(actionPct) : undefined}
        confidence={profile.action.confidence}
      >
        <Distribution
          compact
          values={profile.action.probabilities}
          labels={Object.fromEntries(
            Object.keys(profile.action.probabilities).map((key) => [
              key,
              actionLabel(key),
            ]),
          )}
          highlight={profile.action.choice}
        />
      </ResultRow>

      <ResultRow
        label="Urgency"
        primitive="Score"
        value={`${formatScore(profile.urgency.score)} / ${MAX_URGENCY_LEVEL}`}
        confidence={profile.urgency.confidence}
      >
        <UrgencyMeter score={profile.urgency.score} max={MAX_URGENCY_LEVEL} />
        <Distribution
          compact
          values={profile.urgency.probabilities}
          labels={profile.urgency.legend}
          highlight={String(Math.round(profile.urgency.score))}
        />
      </ResultRow>

      <ResultRow
        label="Human escalation"
        primitive="Noul"
        value={`${yesNo(profile.humanEscalation.flagged)} · ${formatPct(profile.humanEscalation.noul)}`}
      >
        <NoulTrack value={profile.humanEscalation.noul} />
      </ResultRow>

      <ResultRow
        label="Ambiguity"
        primitive="Noul"
        value={`${profile.ambiguity.flagged ? "High" : "Low"} · ${formatPct(profile.ambiguity.noul)}`}
        last
      >
        <NoulTrack value={profile.ambiguity.noul} />
      </ResultRow>
    </div>
  );
}

function ResultRow({
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
  value: string;
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

function UrgencyMeter({ score, max }: { score: number; max: number }) {
  const units = max + 1;
  const filled = Math.min(units, Math.max(0, Math.round(score)));
  return (
    <div className="mt-3 flex gap-1" aria-hidden="true">
      {Array.from({ length: units }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-0.5 flex-1",
            index <= filled ? "bg-foreground" : "bg-border",
          )}
        />
      ))}
    </div>
  );
}

function NoulTrack({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className="relative mt-3 h-px bg-border" aria-hidden="true">
      <span
        className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
        style={{ left: `${clamped * 100}%` }}
      />
    </div>
  );
}

function DeveloperPanel({
  result,
  clientMs,
}: {
  result: AnalyzeResponse | null;
  clientMs: number | null;
}) {
  const success = result?.ok ? result : null;
  const failure = result && !result.ok ? result : null;

  return (
    <div className="mt-10 border-t border-border pt-6">
      <h3 className="text-kicker uppercase text-muted-foreground">
        Developer view
      </h3>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-xs text-muted-foreground sm:grid-cols-4">
        <Metric
          label="Latency"
          value={clientMs != null ? formatMs(clientMs) : "—"}
        />
        <Metric
          label="TypeSafe call"
          value={
            success
              ? formatMs(success.latencyMs)
              : failure?.latencyMs != null
                ? formatMs(failure.latencyMs)
                : "—"
          }
        />
        <Metric
          label="Model"
          value={success?.model ?? failure?.model ?? JEV_MODEL}
        />
        <Metric
          label="Request ID"
          value={success?.requestId ?? failure?.requestId ?? "—"}
        />
      </dl>

      {success ? (
        <>
          <InspectionBlock title="State" value={success.state} />
          <InspectionBlock title="Questions" value={success.questions} />
          <InspectionBlock title="Jev raw assessment" value={success.rawAnswers} />
          <ParsedJudgments profile={success.profile} />
        </>
      ) : (
        <>
          <InspectionBlock title="Questions" value={JEV_QUESTIONS} />
          {failure?.rawAnswers != null ? (
            <InspectionBlock title="Jev raw assessment" value={failure.rawAnswers} />
          ) : (
            <p className="mt-6 text-xs text-muted-foreground">
              State and raw assessment appear after a live Jev response.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt>{label}</dt>
      <dd className="truncate text-foreground">{value}</dd>
    </div>
  );
}

function ParsedJudgments({ profile }: { profile: DecisionProfile }) {
  return (
    <section className="mt-6">
      <h4 className="text-kicker uppercase text-muted-foreground">
        Parsed judgments
      </h4>
      <pre className="mt-2 overflow-x-auto bg-code p-3 font-mono text-xs leading-relaxed text-muted-foreground shadow-[0_0_0_1px_var(--color-border)]">
        {`intent_category  choice=${profile.intent.choice}  confidence=${profile.intent.confidence ?? "—"}
recommended_action  choice=${profile.action.choice}  confidence=${profile.action.confidence ?? "—"}
urgency  score=${profile.urgency.score}  confidence=${profile.urgency.confidence ?? "—"}
human_escalation  noul=${formatProb(profile.humanEscalation.noul)}
ambiguity  noul=${formatProb(profile.ambiguity.noul)}`}
      </pre>
      <p className="mt-2 text-xs text-muted-foreground">
        Confidence is distribution concentration, not a measure of correctness.
      </p>
    </section>
  );
}

function InspectionBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="mt-6">
      <h4 className="text-kicker uppercase text-muted-foreground">{title}</h4>
      <pre className="mt-2 max-h-72 overflow-auto bg-code p-3 font-mono text-xs leading-relaxed text-muted-foreground shadow-[0_0_0_1px_var(--color-border)]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}
