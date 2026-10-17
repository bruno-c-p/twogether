import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useHydrated } from "@tanstack/react-router";
import { useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, monthName } from "@/features/budget/domain/format";
import { chipTrigger } from "@/components/ui/chip-trigger";
import {
  Sheet,
  SheetHeader,
  SheetTrigger,
  type SheetActions,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { currentMonth } from "@/lib/clock";
import { cx } from "@/lib/cx";
import { browserTimeZone } from "@/lib/time-zone";

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

// `prefetch` starts loading a month as soon as the reader aims at it.
function MonthGrid({
  month,
  onPick,
  prefetch,
}: {
  month: string;
  onPick: (month: string) => void;
  prefetch: (month: string) => void;
}) {
  // The year being browsed starts at the picked month's year.
  const { control, setValue } = useForm({
    defaultValues: { year: Number(month.slice(0, 4)) },
  });

  const year = useWatch({ control, name: "year" });
  const today = useHydrated() ? currentMonth(browserTimeZone()) : null;

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="icon"
          aria-label="Ano anterior"
          disabled={year <= 1900}
          onClick={() => setValue("year", year - 1)}
        >
          <ChevronLeft size={18} />
        </Button>
        <strong aria-live="polite" className="text-lg">
          {year}
        </strong>
        <Button
          variant="icon"
          aria-label="Próximo ano"
          disabled={year >= 9999}
          onClick={() => setValue("year", year + 1)}
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
          const value = `${String(year).padStart(4, "0")}-${String(number).padStart(2, "0")}`;

          return (
            <Toggle
              key={value}
              type="button"
              aria-label={monthLabel(value)}
              value={value}
              onPointerEnter={() => prefetch(value)}
              onPointerDown={() => prefetch(value)}
              onFocus={() => prefetch(value)}
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

// "setembro 2026", or "set 2026" on phones. Every pt-BR short month is the
// start of the long one, so phones hide the rest of the word instead of
// rendering a second label.
function MonthText({ month }: { month: string }) {
  const short = monthName(month, true);

  return (
    <span aria-hidden="true">
      {short}
      <span className="max-bp620:hidden">
        {monthName(month).slice(short.length)}
      </span>
      {` ${month.slice(0, 4)}`}
    </span>
  );
}

// `pending` while a picked month loads; the current one stays on screen.
export function MonthFilter({
  month,
  setMonth,
  prefetch,
  pending,
}: {
  month: string;
  setMonth: (month: string) => void;
  prefetch: (month: string) => void;
  pending: boolean;
}) {
  const sheet = useRef<SheetActions>(null);

  return (
    <Sheet
      actions={sheet}
      narrow
      trigger={
        <SheetTrigger
          aria-label={`Selecionar mês e ano: ${monthLabel(month)}`}
          aria-busy={pending}
          className={cx(chipTrigger, "capitalize", pending && "opacity-60")}
        >
          <MonthText month={month} />
          <ChevronDown size={14} aria-hidden="true" className="shrink-0" />
        </SheetTrigger>
      }
    >
      <SheetHeader title="Escolher mês" />
      <MonthGrid
        month={month}
        prefetch={prefetch}
        onPick={(next) => {
          setMonth(next);
          sheet.current?.close();
        }}
      />
    </Sheet>
  );
}
