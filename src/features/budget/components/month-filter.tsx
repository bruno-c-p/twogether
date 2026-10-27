import { lazy, Suspense, useRef } from "react";
import { ChevronDown } from "lucide-react";
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
import { useBrowserSync } from "@/lib/use-browser-sync";

// The grid shows only once the sheet opens; it downloads after the page is
// interactive instead of before.
const loadMonthGrid = () =>
  import("@/features/budget/components/month-grid").then(({ MonthGrid }) => ({
    default: MonthGrid,
  }));

const MonthGrid = lazy(loadMonthGrid);

// Outside the lazy grid, so the grid's placeholder has one fixed height.
function BackToThisMonth({
  month,
  onPick,
}: {
  month: string;
  onPick: (month: string) => void;
}) {
  // Renders only inside the opened sheet, so always in the browser.
  const today = currentMonth(browserTimeZone());

  return month !== today ? (
    <Button
      variant="secondary"
      className="mt-4 w-full"
      onClick={() => onPick(today)}
    >
      Voltar para este mês
    </Button>
  ) : null;
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

  function pick(next: string) {
    setMonth(next);
    sheet.current?.close();
  }

  useBrowserSync(
    ["month-grid"],
    () => void loadMonthGrid().catch(() => undefined),
  );

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
      {/* Holds the grid's height so a sheet opened before it loads does not
          grow under the reader's finger. */}
      <Suspense fallback={<div aria-hidden="true" className="h-68" />}>
        <MonthGrid month={month} prefetch={prefetch} onPick={pick} />
      </Suspense>
      <BackToThisMonth month={month} onPick={pick} />
    </Sheet>
  );
}
