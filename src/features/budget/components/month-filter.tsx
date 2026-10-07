import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useHydrated } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  currentMonth,
  monthLabel,
  monthName,
} from "@/features/budget/domain/format";
import { chipTrigger } from "@/components/ui/chip-trigger";
import { Sheet, SheetHeader, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

function MonthGrid({
  month,
  onPick,
}: {
  month: string;
  onPick: (month: string) => void;
}) {
  const [year, setYear] = useState(() => Number(month.slice(0, 4)) || 0);
  const today = useHydrated() ? currentMonth() : null;

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="icon"
          aria-label="Ano anterior"
          onClick={() => setYear(year - 1)}
        >
          <ChevronLeft size={18} />
        </Button>
        <strong aria-live="polite" className="text-lg">
          {year}
        </strong>
        <Button
          variant="icon"
          aria-label="Próximo ano"
          onClick={() => setYear(year + 1)}
        >
          <ChevronRight size={18} />
        </Button>
      </div>
      <ToggleGroup
        className="grid grid-cols-3 gap-2"
        aria-label="Mês"
        value={[month]}
        onValueChange={(values) => {
          if (values[0]) onPick(values[0]);
        }}
      >
        {MONTHS.map((number) => {
          const value = `${year}-${String(number).padStart(2, "0")}`;

          return (
            <Toggle
              key={value}
              type="button"
              aria-label={monthLabel(value)}
              value={value}
              onClick={() => {
                if (value === month) onPick(value);
              }}
              className={cx(
                "capitalize cursor-pointer border border-solid rounded-md",
                "py-4 text-md text-text",
                value === month
                  ? "border-green bg-surface-soft font-600"
                  : "border-border bg-surface",
              )}
            >
              {monthName(value, true)}
            </Toggle>
          );
        })}
      </ToggleGroup>
      {today && month !== today && (
        <Button
          variant="secondary"
          className="mt-4 w-full"
          onClick={() => onPick(today)}
        >
          Voltar para este mês
        </Button>
      )}
    </>
  );
}

export function MonthFilter({
  month,
  setMonth,
}: {
  month: string;
  setMonth: (month: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      narrow
      trigger={
        <SheetTrigger
          aria-label={`Selecionar mês e ano: ${monthLabel(month)}`}
          className={cx(chipTrigger, "capitalize")}
        >
          <span aria-hidden="true" className="max-bp620:hidden">
            {monthLabel(month)}
          </span>
          <span aria-hidden="true" className="hidden max-bp620:inline">
            {monthLabel(month, true)}
          </span>
          <ChevronDown size={14} aria-hidden="true" className="shrink-0" />
        </SheetTrigger>
      }
    >
      <SheetHeader title="Escolher mês" />
      <MonthGrid
        month={month}
        onPick={(next) => {
          setMonth(next);
          setOpen(false);
        }}
      />
    </Sheet>
  );
}
