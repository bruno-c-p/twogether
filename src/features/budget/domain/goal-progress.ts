export interface GoalProgress {
  /** Rounded share of the plan already spent, or null when nothing is planned. */
  percent: number | null;
  /** Bar fill, 0-100. Spending against an empty plan fills the bar. */
  fill: number;
  over: number;
  remaining: number;
}

export function goalProgress(amount: number, planned: number): GoalProgress {
  const over = Math.max(0, amount - planned);
  const remaining = Math.max(0, planned - amount);

  if (planned <= 0) {
    return { percent: null, fill: amount > 0 ? 100 : 0, over, remaining };
  }

  return {
    percent: Math.round((amount / planned) * 100),
    fill: Math.min(100, (amount / planned) * 100),
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
  return (
    Math.round(values.reduce<number>((sum, v) => sum + (v ?? 0), 0) * 100) / 100
  );
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
