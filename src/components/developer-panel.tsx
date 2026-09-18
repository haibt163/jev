import { useState } from "react";
import { formatMs } from "@/lib/jev/core/format";
import { CopyButton } from "./judgment-widgets";
import type { DevPayload } from "@/lib/client/dev-payload";

/**
 * Developer view: what we sent, what Jev returned, what the application
 * did with it. Read-only instrumentation; never shows credentials.
 */
export function DeveloperPanel({ payload }: { payload: DevPayload | null }) {
  if (!payload) {
    return (
      <div className="mt-8 border-t border-border pt-6">
        <h3 className="text-kicker uppercase text-muted-foreground">Developer view</h3>
        <p className="mt-3 text-xs text-muted-foreground">
          State, questions, raw assessment, and telemetry appear here after an evaluation.
        </p>
      </div>
    );
  }

  const { telemetry } = payload;

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-kicker uppercase text-muted-foreground">Developer view</h3>
        <CopyButton value={payload} label="Copy all" />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-xs text-muted-foreground sm:grid-cols-4">
        <Metric label="Use case" value={payload.useCaseId} />
        <Metric label="Total" value={telemetry.totalMs != null ? formatMs(telemetry.totalMs) : "—"} />
        <Metric label="TypeSafe call" value={telemetry.typesafeMs != null ? formatMs(telemetry.typesafeMs) : "—"} />
        <Metric label="Model" value={telemetry.model ?? "—"} />
        <Metric label="Request ID" value={telemetry.requestId ?? "—"} />
        <Metric
          label="Tokens"
          value={
            telemetry.usage
              ? `${telemetry.usage.input_tokens} in / ${telemetry.usage.output_tokens} out`
              : "—"
          }
        />
        <Metric label="Error" value={payload.error?.code ?? "none"} />
      </dl>

      {payload.error ? (
        <p className="mt-3 text-xs text-destructive">{payload.error.detail}</p>
      ) : null}

      {payload.thresholds ? (
        <InspectionBlock title="Application thresholds" value={payload.thresholds} />
      ) : null}
      <InspectionBlock title="State sent to Jev" value={payload.state} />
      <InspectionBlock title="Questions sent to Jev" value={payload.questions} />
      <InspectionBlock title="Jev raw assessment" value={payload.rawAnswers} />
      <InspectionBlock title="Normalized judgment" value={payload.judgment} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt>{label}</dt>
      <dd className="truncate text-foreground" title={value}>
        {value}
      </dd>
    </div>
  );
}

function InspectionBlock({ title, value }: { title: string; value: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="text-kicker uppercase tracking-wide text-muted-foreground transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {open ? "▾" : "▸"} {title}
        </button>
        <CopyButton value={value} />
      </div>
      {open ? (
        <pre className="mt-2 max-h-72 overflow-auto bg-code p-3 font-mono text-xs leading-relaxed text-muted-foreground shadow-[0_0_0_1px_var(--color-border)]">
          {value == null ? "null" : JSON.stringify(value, null, 2)}
        </pre>
      ) : null}
    </section>
  );
}
