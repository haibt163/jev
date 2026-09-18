import { useId } from "react";
import { splitBatch } from "@/lib/client/triage-batch";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";

const MAX_LINE = 4000;

export function TriageInput({
  message,
  onMessageChange,
  batchMode,
  onBatchModeChange,
  batchText,
  onBatchTextChange,
  examples,
  analyzing,
  maxBatchSize,
  onSubmit,
}: {
  message: string;
  onMessageChange: (value: string) => void;
  batchMode: boolean;
  onBatchModeChange: (value: boolean) => void;
  batchText: string;
  onBatchTextChange: (value: string) => void;
  examples: ReadonlyArray<{ id: string; label: string; text: string }>;
  analyzing: boolean;
  maxBatchSize: number;
  onSubmit: () => void;
}) {
  const inputId = useId();
  const batchId = useId();
  const batchItems = splitBatch(batchText);
  const batchReady = batchItems.length > 0 && batchItems.length <= maxBatchSize;

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={batchMode ? batchId : inputId}>
          {batchMode ? "Messages (one per line)" : "Message"}
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Batch</span>
          <Switch
            id={`${batchId}-toggle`}
            checked={batchMode}
            onCheckedChange={onBatchModeChange}
            aria-label="Toggle batch mode"
          />
        </div>
      </div>

      {batchMode ? (
        <div className="relative mt-2 min-h-44 flex-1">
          <Textarea
            id={batchId}
            value={batchText}
            onChange={(event) => onBatchTextChange(event.target.value)}
            placeholder={"One message per line, e.g.\nJust wanted to say the new dashboard is fantastic.\nExports fail with a spinner that never finishes.\nBUY NOW!!! Cheap followers!"}
            className="absolute inset-0 h-full min-h-44"
            disabled={analyzing}
          />
        </div>
      ) : (
        <div className="relative mt-2 min-h-44 flex-1">
          <Textarea
            id={inputId}
            value={message}
            onChange={(event) => onMessageChange(event.target.value.slice(0, MAX_LINE))}
            placeholder="Paste customer feedback, a product comment, or a marketing message…"
            className="absolute inset-0 h-full min-h-44"
            disabled={analyzing}
          />
        </div>
      )}

      {batchMode ? (
        <p
          className={cn(
            "mt-2 font-mono text-xs tabular-nums",
            batchItems.length > maxBatchSize ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {batchItems.length} / {maxBatchSize} items
        </p>
      ) : null}

      <div className="mt-4 flex shrink-0 items-center gap-3">
        <Button
          type="submit"
          size="lg"
          disabled={analyzing || (batchMode ? !batchReady : !message.trim())}
        >
          {analyzing
            ? "Triaging…"
            : batchMode
              ? `Triage ${Math.min(batchItems.length, maxBatchSize)} messages`
              : "Triage message"}
        </Button>
        {batchMode && batchItems.length > maxBatchSize ? (
          <span className="text-xs text-destructive">
            Limit is {maxBatchSize} per batch.
          </span>
        ) : null}
      </div>

      <div className="mt-5 shrink-0">
        <h3 className="text-kicker uppercase text-muted-foreground">Examples</h3>
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {examples.map((example) => (
            <li key={example.id}>
              <button
                type="button"
                onClick={() =>
                  batchMode
                    ? onBatchTextChange(batchText ? `${batchText}\n${example.text}` : example.text)
                    : onMessageChange(example.text)
                }
                className={cn(
                  "min-h-9 rounded-md px-3 text-sm transition-[background-color,box-shadow,color] duration-150 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  "text-muted-foreground shadow-[0_0_0_1px_var(--color-border)] hover:bg-muted hover:text-foreground",
                )}
              >
                {example.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
