import { useId } from "react";
import { MAX_MESSAGE_LENGTH } from "@/lib/jev/usecases/support-router/catalog";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

export function SupportInput({
  message,
  onMessageChange,
  examples,
  analyzing,
  onSubmit,
}: {
  message: string;
  onMessageChange: (value: string) => void;
  examples: ReadonlyArray<{ id: string; label: string; text: string }>;
  analyzing: boolean;
  onSubmit: () => void;
}) {
  const inputId = useId();
  const selectedExample = examples.find((example) => example.text === message);

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={inputId}>Customer request</Label>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {message.length} / {MAX_MESSAGE_LENGTH}
        </span>
      </div>
      <div className="relative mt-2 min-h-44 flex-1">
        <Textarea
          id={inputId}
          value={message}
          onChange={(event) =>
            onMessageChange(event.target.value.slice(0, MAX_MESSAGE_LENGTH))
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Describe a request in any words…"
          className="absolute inset-0 h-full min-h-44"
          disabled={analyzing}
        />
      </div>
      <div className="mt-4 flex shrink-0 items-center gap-3">
        <Button type="submit" size="lg" disabled={analyzing || !message.trim()}>
          {analyzing ? "Analyzing…" : "Analyze with Jev"}
        </Button>
        <span className="text-xs text-muted-foreground">Ctrl / ⌘ + Enter</span>
      </div>
      <div className="mt-5 shrink-0">
        <h3 className="text-kicker uppercase text-muted-foreground">Examples</h3>
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {examples.map((example) => (
            <li key={example.id}>
              <button
                type="button"
                title={example.text}
                onClick={() => onMessageChange(example.text)}
                className={cn(
                  "min-h-9 rounded-md px-3 text-sm transition-[background-color,box-shadow,color] duration-150 ease-out",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  message === example.text
                    ? "bg-muted text-foreground shadow-[0_0_0_1px_var(--color-accent)]"
                    : "text-muted-foreground shadow-[0_0_0_1px_var(--color-border)] hover:bg-muted hover:text-foreground",
                )}
              >
                {example.label}
              </button>
            </li>
          ))}
        </ul>
        {selectedExample ? (
          <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
            {selectedExample.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
