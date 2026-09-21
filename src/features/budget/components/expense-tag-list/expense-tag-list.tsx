import { ColorDot } from "@/components/ui/color-dot/color-dot";
import styles from "@/features/budget/components/expense-tag-list/expense-tag-list.module.css";

export interface ExpenseTagSegment {
  name: string | null;
  amount: number;
  share: number;
  color: string;
}

export function ExpenseTagList({
  segments,
  hidden,
  display,
}: {
  segments: ExpenseTagSegment[];
  hidden: boolean;
  display: (amount: number) => string;
}) {
  return (
    <ul className={styles.expenseTagList}>
      {segments.map((tag) => (
        <li key={JSON.stringify(tag.name)}>
          <ColorDot style={{ background: tag.color }} />
          <span className={styles.expenseTagName}>
            {tag.name ?? "Sem tags"}
          </span>
          <span className={styles.expenseTagTrack} aria-hidden="true">
            <i
              style={{
                width: hidden ? "0%" : `${tag.share}%`,
                background: tag.color,
              }}
            />
          </span>
          <strong>{display(tag.amount)}</strong>
          <span>
            {hidden
              ? "••"
              : `${tag.share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
          </span>
        </li>
      ))}
    </ul>
  );
}
