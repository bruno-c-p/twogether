import { Repeat2 } from "lucide-react";
import { FieldError } from "@/components/ui/field/field";
import styles from "@/features/budget/components/recurrence-panel/recurrence-panel.module.css";

export function RecurrencePanel({
  recurring,
  occurrences,
  error,
  onRecurringChange,
  onOccurrencesChange,
}: {
  recurring: boolean;
  occurrences: number;
  error?: string;
  onRecurringChange: (value: boolean) => void;
  onOccurrencesChange: (value: number) => void;
}) {
  return (
    <section className={styles.recurrencePanel} aria-label="Recorrência">
      <div className={styles.recurrenceHeading}>
        <span className={styles.recurrenceIcon}>
          <Repeat2 size={18} />
        </span>
        <div className={styles.recurrenceCopy}>
          <label htmlFor="recurring">Repetir mensalmente</label>
          <p>Para contas e entradas que se repetem.</p>
        </div>
        <input
          id="recurring"
          className={styles.recurrenceSwitch}
          type="checkbox"
          role="switch"
          checked={recurring}
          onChange={(event) => onRecurringChange(event.target.checked)}
        />
      </div>
      {recurring && (
        <div className={styles.recurrenceDetails}>
          <div className={styles.recurrenceCount}>
            <label htmlFor="occurrences">Por quantos meses?</label>
            <div className={styles.recurrenceNumber}>
              <input
                id="occurrences"
                type="number"
                min={2}
                max={120}
                required
                value={Number.isNaN(occurrences) ? "" : occurrences}
                onChange={(event) =>
                  onOccurrencesChange(event.target.valueAsNumber)
                }
                aria-describedby={
                  error
                    ? "recurrence-hint occurrences-error"
                    : "recurrence-hint"
                }
                aria-invalid={error ? true : undefined}
              />
              <span>meses</span>
            </div>
            <FieldError id="occurrences-error">{error}</FieldError>
          </div>
          <p id="recurrence-hint">
            Inclui o mês da primeira transação. Em meses mais curtos, usamos o
            último dia.
          </p>
        </div>
      )}
    </section>
  );
}
