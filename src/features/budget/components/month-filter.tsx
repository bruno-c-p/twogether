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
import { cx } from "@/lib/cx";
import { useBrowserSync } from "@/lib/use-browser-sync";

// The grid shows only once the sheet opens; it downloads after the page is
// interactive instead of before.
const loadMonthGrid = () =>
  import("@/features/budget/components/month-grid").then(({ MonthGrid }) => ({
    default: MonthGrid,
  }));

const MonthGrid = lazy(loadMonthGrid);

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
      <Suspense>
        <MonthGrid
          month={month}
          prefetch={prefetch}
          onPick={(next) => {
            setMonth(next);
            sheet.current?.close();
          }}
        />
      </Suspense>
    </Sheet>
  );
}
