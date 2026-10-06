import { useState } from "react";
import { chipTrigger } from "@/components/ui/chip-trigger";
import { Check, ChevronDown } from "lucide-react";
import { Sheet, SheetHeader, SheetTrigger } from "@/components/ui/sheet";
import type { Member } from "@/features/budget/domain/types";
import { cx } from "@/lib/cx";

export function MemberFilter({
  members,
  userId,
  value,
  onChange,
}: {
  members: Member[];
  userId: string;
  value: string;
  onChange: (memberId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const options = [
    { id: "all", label: "Nós" },
    ...[...members]
      .sort((a, b) => Number(b.id === userId) - Number(a.id === userId))
      .map((member) => ({
        id: member.id,
        label: member.id === userId ? "Eu" : member.name,
      })),
  ];

  const current = options.find((option) => option.id === value) ?? options[0];

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      narrow
      trigger={
        <SheetTrigger
          aria-label={`Filtrar por pessoa: ${current.label}`}
          className={chipTrigger}
        >
          <span className="truncate max-w-[135px]">{current.label}</span>
          <ChevronDown size={14} aria-hidden="true" className="shrink-0" />
        </SheetTrigger>
      }
    >
      <SheetHeader title="Filtrar por pessoa" />
      <div role="radiogroup" aria-label="Pessoa" className="grid gap-1.5">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.id === current.id}
            onClick={() => {
              onChange(option.id);
              setOpen(false);
            }}
            className={cx(
              "flex items-center justify-between gap-2 cursor-pointer",
              "border border-solid rounded-md px-4 py-3 text-md text-text",
              option.id === current.id
                ? "border-green bg-surface-soft font-600"
                : "border-border bg-surface",
            )}
          >
            <span className="truncate">{option.label}</span>
            {option.id === current.id && <Check size={16} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
