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
      <div className="flex items-center justify-between mb-[12px]">
        <Button
          variant="icon"
          aria-label="Ano anterior"
          onClick={() => setYear(year - 1)}
        >
          <ChevronLeft size={18} />
        </Button>
        <strong aria-live="polite" className="text-[16px]">
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
      <div className="grid grid-cols-3 gap-[8px]">
        {MONTHS.map((number) => {
          const value = `${year}-${String(number).padStart(2, "0")}`;

          return (
            <button
              key={value}
              type="button"
              aria-label={monthLabel(value)}
              aria-pressed={value === month}
              onClick={() => onPick(value)}
              className={cx(
                "capitalize cursor-pointer border border-solid rounded-[10px]",
                "py-[14px] text-[14px] text-text",
                value === month
                  ? "border-green bg-surface-soft font-600"
                  : "border-border bg-surface",
              )}
            >
              {monthName(number)}
            </button>
          );
        })}
      </div>
      {today && month !== today && (
        <Button
          variant="secondary"
          className="mt-[16px] w-full"
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
