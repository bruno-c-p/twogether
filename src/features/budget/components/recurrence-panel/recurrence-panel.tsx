import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Repeat2 } from "lucide-react";
import { FieldError, FieldRoot } from "@/components/ui/field/field";
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
        <Switch
          id="recurring"
          checked={recurring}
          onCheckedChange={(checked) => onRecurringChange(checked)}
        />
      </div>
      {recurring && (
        <div className={styles.recurrenceDetails}>
          <FieldRoot className={styles.recurrenceCount}>
            <label htmlFor="occurrences">Por quantos meses?</label>
            <div className={styles.recurrenceNumber}>
              <Input
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
          </FieldRoot>
          <p id="recurrence-hint">
            Inclui o mês da primeira transação. Em meses mais curtos, usamos o
            último dia.
          </p>
        </div>
      )}
    </section>
  );
}
