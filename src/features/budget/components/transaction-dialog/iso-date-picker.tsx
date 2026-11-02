import { DatePicker } from "@/components/glaze/ui/date-picker";
import { localDate } from "@/features/budget/domain/format";

function fromIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return year && month && day ? new Date(year, month - 1, day) : null;
}

// The forms hold dates as YYYY-MM-DD; Glaze's picker works in local Dates.
export function IsoDatePicker({
  value,
  onValueChange,
  ...props
}: {
  value: string;
  onValueChange: (value: string) => void;
  "aria-invalid"?: boolean;
}) {
  return (
    <DatePicker
      locale="pt-BR"
      placeholder="Escolha uma data"
      value={fromIso(value)}
      onValueChange={(date: Date | null) =>
        onValueChange(date ? localDate(date) : "")
      }
      {...props}
    />
  );
}
