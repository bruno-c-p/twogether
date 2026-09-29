import { localDate } from "@/features/budget/domain/format";

const MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function parts(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return { year, month, day };
}

export function dateLabel(date: string, today: string) {
  const { year, month, day } = parts(date);
  const now = parts(today);

  const yesterday = parts(
    localDate(new Date(now.year, now.month - 1, now.day - 1)),
  );

  const short = `${String(day).padStart(2, "0")} ${MONTHS[month - 1]}`;

  if (date === today) return `Hoje, ${day} ${MONTHS[month - 1]}`;

  if (
    year === yesterday.year &&
    month === yesterday.month &&
    day === yesterday.day
  )
    return `Ontem, ${day} ${MONTHS[month - 1]}`;

  return year === now.year ? short : `${short} ${year}`;
}
