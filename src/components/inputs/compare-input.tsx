import { useId } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

export function CompareInput({
  request,
  candidates,
  onRequestChange,
  onCandidateChange,
  onCandidateRemove,
  onCandidateAdd,
  onLoadExample,
  analyzing,
  onSubmit,
}: {
  request: string;
  candidates: Array<{ key: string; name: string; description: string }>;
  onRequestChange: (value: string) => void;
  onCandidateChange: (key: string, patch: Partial<{ name: string; description: string }>) => void;
  onCandidateRemove: (key: string) => void;
  onCandidateAdd: () => void;
  onLoadExample: () => void;
  analyzing: boolean;
  onSubmit: () => void;
}) {
  const requestId = useId();
  const ready =
    request.trim().length > 0 &&
    candidates.some((c) => c.name.trim() && c.description.trim());

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Label htmlFor={requestId}>What do you need?</Label>
      <Textarea
        id={requestId}
        value={request}
        onChange={(event) => onRequestChange(event.target.value.slice(0, 4000))}
        placeholder="e.g. I need a laptop for programming and travel."
        className="mt-2 min-h-20"
        disabled={analyzing}
      />
      <button
        type="button"
        onClick={onLoadExample}
        className="mt-2 self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        Load example candidate set
      </button>

      <div className="mt-5 flex items-baseline justify-between">
        <h3 className="text-kicker uppercase text-muted-foreground">Candidates</h3>
        <button
          type="button"
          onClick={onCandidateAdd}
          disabled={analyzing}
          className="text-xs text-muted-foreground transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-40"
        >
          + Add candidate
        </button>
      </div>
      <ul className="mt-2 space-y-2.5">
        {candidates.map((candidate, index) => (
          <li
            key={candidate.key}
            className="rounded-md bg-card p-3 shadow-[0_0_0_1px_var(--color-border)]"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <Input
                value={candidate.name}
                onChange={(event) =>
                  onCandidateChange(candidate.key, { name: event.target.value })
                }
                placeholder={`Candidate ${index + 1} name`}
                disabled={analyzing}
                maxLength={200}
              />
              <button
                type="button"
                onClick={() => onCandidateRemove(candidate.key)}
                disabled={analyzing || candidates.length <= 2}
                aria-label={`Remove candidate ${index + 1}`}
                className="shrink-0 px-1.5 text-muted-foreground transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-30"
              >
                ✕
              </button>
            </div>
            <Textarea
              value={candidate.description}
              onChange={(event) =>
                onCandidateChange(candidate.key, {
                  description: event.target.value.slice(0, 4000),
                })
              }
              placeholder="Describe this option: weight, size, specs, price…"
              className="mt-2 min-h-16"
              disabled={analyzing}
            />
          </li>
        ))}
      </ul>
      <div className="mt-4 shrink-0">
        <Button type="submit" size="lg" disabled={analyzing || !ready}>
          {analyzing
            ? "Scoring candidates…"
            : `Compare ${candidates.filter((c) => c.name.trim() && c.description.trim()).length} candidates`}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Each candidate is judged independently against your stated needs; the
          weighted comparison is computed by this application, not by Jev.
        </p>
      </div>
    </form>
  );
}
