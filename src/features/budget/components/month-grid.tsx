import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useForm, useWatch } from "react-hook-form";
import { ChevronLeft, ChevronRight, Icon } from "@/components/glaze/icon";
import { Button } from "@/components/glaze/ui/button";
import { Chip } from "@/components/glaze/ui/chip";
import { monthLabel, monthName } from "@/features/budget/domain/format";

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

// `prefetch` starts loading a month as soon as the reader aims at it.
export function MonthGrid({
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

  return (
    <>
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Ano anterior"
          disabled={year <= 1900}
          onClick={() => setValue("year", year - 1)}
        >
          <Icon icon={ChevronLeft} />
        </Button>
        <strong aria-live="polite" className="type-label tabular-nums">
          {year}
        </strong>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Próximo ano"
          disabled={year >= 9999}
          onClick={() => setValue("year", year + 1)}
        >
          <Icon icon={ChevronRight} />
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
            <Chip
              key={value}
              aria-label={monthLabel(value)}
              value={value}
              onPointerEnter={() => prefetch(value)}
              onPointerDown={() => prefetch(value)}
              onFocus={() => prefetch(value)}
              onClick={() => {
                if (value === month) onPick(value);
              }}
              className="w-full justify-center capitalize"
            >
              {monthName(value, true)}
            </Chip>
          );
        })}
      </ToggleGroup>
    </>
  );
}
