import { GOALS } from "@/features/budget/constants";
import { money } from "@/features/budget/domain/format";
import type { GoalId, TransactionKind } from "@/features/budget/domain/types";

export interface RegisterImpactData {
  summary: { income: number; goals: { id: GoalId; amount: number }[] };
  plans: { id: GoalId; planned: number }[];
}

export interface RegisterImpact {
  text: string;
  tone: "neutral" | "over" | "ok";
}

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function monthName(month: string) {
  return MONTHS[Number(month.slice(5, 7)) - 1] ?? month;
}

// What confirming does to the month being viewed. A date in another month
// has no figures to compare against, so it only says where it lands.
export function registerImpact({
  kind,
  goal,
  amount,
  date,
  month,
  summary,
  plans,
}: RegisterImpactData & {
  kind: TransactionKind;
  goal: GoalId | null;
  amount: number;
  date: string;
  month: string;
}): RegisterImpact {
  if (!date.startsWith(month)) {
    return {
      text: `Entra em ${monthName(date.slice(0, 7))}, fora do mês em tela.`,
      tone: "neutral",
    };
  }

  if (kind === "income") {
    return {
      text: `Entradas de ${monthName(month)} passam para ${money(summary.income + amount)}.`,
      tone: "neutral",
    };
  }

  const name = GOALS.find((item) => item.id === goal)?.name;

  if (!goal || !name) {
    return { text: "Escolha uma meta para registrar.", tone: "neutral" };
  }

  const spent = summary.goals.find((item) => item.id === goal)?.amount ?? 0;
  const planned = plans.find((item) => item.id === goal)?.planned ?? 0;
  const after = spent + amount;

  if (after > planned) {
    return {
      text: `${name} fica ${money(after - planned)} acima do planejado.`,
      tone: "over",
    };
  }

  return {
    text: `Depois disso, restam ${money(planned - after)} em ${name}.`,
    tone: "ok",
  };
}
