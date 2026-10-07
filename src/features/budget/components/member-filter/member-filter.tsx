import { Button } from "@/components/ui/button";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
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
      <RadioGroup<string>
        value={current.id}
        aria-label="Pessoa"
        className="grid gap-1.5"
        onValueChange={(next) => {
          onChange(next);
          setOpen(false);
        }}
      >
        {options.map((option) => (
          <Radio.Root
            nativeButton
            render={<Button variant="unstyled" />}
            key={option.id}
            value={option.id}
            onClick={() => {
              if (option.id === current.id) setOpen(false);
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
          </Radio.Root>
        ))}
      </RadioGroup>
    </Sheet>
  );
}
