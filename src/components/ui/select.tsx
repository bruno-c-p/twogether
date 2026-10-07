import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { cx } from "@/lib/cx";

export function Select<Value extends string>({
  items,
  value,
  onValueChange,
  label,
  className,
}: {
  items: { value: Value; label: string }[];
  value: Value;
  onValueChange: (value: Value) => void;
  label: string;
  className?: string;
}) {
  return (
    <BaseSelect.Root
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next);
      }}
    >
      <BaseSelect.Trigger
        aria-label={label}
        className={cx(
          "inline-flex items-center gap-2 min-w-0 max-w-full",
          className,
        )}
      >
        <BaseSelect.Value className="truncate" />
        <BaseSelect.Icon className="shrink-0">
          <ChevronDown size={14} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={6} className="z-[70] outline-0">
          <BaseSelect.Popup className="min-w-[var(--anchor-width)] max-w-[calc(100vw-16px)] max-h-[var(--available-height)] overflow-y-auto rounded-md border border-solid border-border bg-surface text-text p-1 shadow-lg outline-0">
            <BaseSelect.List>
              {items.map((item) => (
                <BaseSelect.Item
                  key={item.value}
                  value={item.value}
                  className="flex items-center justify-between gap-4 px-3 py-2 rounded-sm text-sm cursor-pointer data-[highlighted]:bg-surface-soft outline-0"
                >
                  <BaseSelect.ItemText>{item.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator>
                    <Check size={14} />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
