import { lazy, Suspense, useRef } from "react";
import type { Popover as BasePopover } from "@base-ui/react/popover";
import { ChevronDown, Icon } from "@/components/glaze/icon";
import { Button } from "@/components/glaze/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/glaze/ui/popover";
import { monthLabel, monthName } from "@/features/budget/domain/format";
import { currentMonth } from "@/lib/clock";
import { cx } from "@/lib/cx";
import { browserTimeZone } from "@/lib/time-zone";
import { useBrowserSync } from "@/lib/use-browser-sync";

// The grid shows only once the popover opens; it downloads after the page is
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
  // Renders only inside the opened popover, so always in the browser.
  const today = currentMonth(browserTimeZone());

  return month !== today ? (
    <Button
      variant="secondary"
      className="w-full"
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
      <span className="max-sm:hidden">
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
  const popover = useRef<BasePopover.Root.Actions>(null);

  function pick(next: string) {
    setMonth(next);
    popover.current?.close();
  }

  useBrowserSync(
    ["month-grid"],
    () => void loadMonthGrid().catch(() => undefined),
  );

  return (
    <Popover actionsRef={popover}>
      <PopoverTrigger
        render={<Button variant="secondary" size="sm" />}
        aria-label={`Selecionar mês e ano: ${monthLabel(month)}`}
        aria-busy={pending}
        className={cx("capitalize", pending && "text-text-2")}
      >
        <MonthText month={month} />
        <Icon icon={ChevronDown} />
      </PopoverTrigger>
      <PopoverContent align="start">
        <PopoverHeader>
          <PopoverTitle>Escolher mês</PopoverTitle>
        </PopoverHeader>
        {/* Holds the grid's height so a popover opened before it loads does
            not grow under the reader's finger. */}
        <Suspense fallback={<div aria-hidden="true" className="h-43" />}>
          <MonthGrid month={month} prefetch={prefetch} onPick={pick} />
        </Suspense>
        <BackToThisMonth month={month} onPick={pick} />
      </PopoverContent>
    </Popover>
  );
}
