import type { DecisionProfile } from "@/lib/jev/usecases/support-router/types";
import { deriveWorkflow } from "@/lib/jev/usecases/support-router/rules";
import { MAX_URGENCY_LEVEL } from "@/lib/jev/usecases/support-router/catalog";
import { formatPct, formatScore } from "@/lib/jev/core/format";
import { Distribution, NoulTrack, ResultRow, ScoreMeter } from "../judgment-widgets";
import { intentLabel, actionLabel } from "@/lib/jev/usecases/support-router/catalog";

/** Primary card: the typed profile plus the application's deterministic workflow. */
export function SupportResult({ profile }: { profile: DecisionProfile }) {
  const workflow = deriveWorkflow(profile);
  const intentPct = profile.intent.probabilities[profile.intent.choice];

  return (
    <div className="lab-in border-t border-border">
      <section className="py-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-kicker uppercase text-muted-foreground">
            Application routing
          </h3>
          <span className="rounded-sm px-1.5 py-0.5 text-kicker uppercase text-foreground shadow-[0_0_0_1px_var(--color-accent)]">
            code
          </span>
        </div>
        <p className="mt-3 text-lg font-medium leading-snug tracking-tight text-foreground">
          {workflow.explanation}
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {workflow.facts.map((fact) => (
            <li
              key={fact}
              className="rounded-sm bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
            >
              {fact}
            </li>
          ))}
        </ul>
        {profile.warnings.length ? (
          <p className="mt-3 text-xs text-warning">{profile.warnings.join(" ")}</p>
        ) : null}
      </section>

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
            Object.keys(profile.intent.probabilities).map((key) => [key, intentLabel(key)]),
          )}
          highlight={profile.intent.choice}
        />
      </ResultRow>

      <ResultRow
        label="Recommended action"
        primitive="Choice"
        value={profile.action.label}
        meta={
          profile.action.probabilities[profile.action.choice] != null
            ? formatPct(profile.action.probabilities[profile.action.choice])
            : undefined
        }
        confidence={profile.action.confidence}
      >
        <Distribution
          compact
          values={profile.action.probabilities}
          labels={Object.fromEntries(
            Object.keys(profile.action.probabilities).map((key) => [key, actionLabel(key)]),
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
        <ScoreMeter
          score={profile.urgency.score}
          max={MAX_URGENCY_LEVEL}
          levelLabels={Object.entries(profile.urgency.legend)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([, text]) => text)}
        />
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
        value={`${profile.humanEscalation.flagged ? "Yes" : "No"} · ${formatPct(profile.humanEscalation.noul)}`}
      >
        <NoulTrack value={profile.humanEscalation.noul} />
        <p className="mt-2 text-xs text-muted-foreground">
          Probability the request warrants a person; the application flags review at 50%.
        </p>
      </ResultRow>

      <ResultRow
        label="Ambiguity"
        primitive="Noul"
        value={`${profile.ambiguity.flagged ? "High" : "Low"} · ${formatPct(profile.ambiguity.noul)}`}
        last
      >
        <NoulTrack value={profile.ambiguity.noul} />
        <p className="mt-2 text-xs text-muted-foreground">
          Probability the request is materially ambiguous; above 50% the application asks for clarification first.
        </p>
      </ResultRow>
    </div>
  );
}
