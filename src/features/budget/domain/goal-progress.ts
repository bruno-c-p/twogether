import Big from "big.js";
import { percentOf, sum } from "@/lib/decimal";

export interface GoalProgress {
  /** Rounded share of the plan already spent, or null when nothing is planned. */
  percent: number | null;
  /** Bar fill, 0-100. Spending against an empty plan fills the bar. */
  fill: number;
  over: number;
  remaining: number;
}

export function goalProgress(amount: number, planned: number): GoalProgress {
  const difference = new Big(amount).minus(planned).toNumber();
  const over = Math.max(0, difference);
  const remaining = Math.max(0, -difference);

  if (planned <= 0) {
    return { percent: null, fill: amount > 0 ? 100 : 0, over, remaining };
  }

  return {
    percent: new Big(percentOf(amount, planned))
      .round(0, Big.roundHalfUp)
      .toNumber(),
    fill: Math.min(100, percentOf(amount, planned)),
    over,
    remaining,
  };
}

/** The line under a goal's bar; hidden values keep only the warning. */
export function progressText(
  progress: GoalProgress,
  hidden: boolean,
  displayMoney: (value: number) => string,
) {
  const over = progress.over > 0;

  if (hidden) return over ? "Acima do planejado" : "";

  // Nothing planned means there is no share to show, only the amount.
  const share = progress.percent === null ? "" : `${progress.percent}% · `;

  return over
    ? `${share}${displayMoney(progress.over)} acima`
    : `${share}restam ${displayMoney(progress.remaining)}`;
}

export function sumPercentages(values: Array<number | null>) {
  return new Big(sum(values.map((v) => v ?? 0)))
    .round(2, Big.roundHalfUp)
    .toNumber();
}

export function percentLabel(value: number | null) {
  if (value === null) return "—";

  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

export function incomeStatus(total: number) {
  if (total === 0) return "Sem renda para distribuir.";

  if (total === 100) return "Distribuição fecha em 100%.";

  return "A distribuição não soma 100%.";
}
