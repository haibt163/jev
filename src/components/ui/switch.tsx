import { cn } from "@/lib/utils";

type SwitchProps = {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function Switch({
  id,
  checked,
  onCheckedChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-8 shrink-0 items-center rounded-full bg-muted shadow-[0_0_0_1px_var(--color-border)] transition-colors duration-150 ease-out",
        "after:absolute after:inset-y-[-12px] after:inset-x-[-10px] after:content-['']",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        "disabled:cursor-not-allowed disabled:opacity-40",
        checked && "bg-accent shadow-none",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-4 translate-x-0.5 rounded-full bg-foreground transition-transform duration-150 ease-out",
          checked && "translate-x-3.5 bg-accent-foreground",
        )}
      />
    </button>
  );
}
