import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  Label,
} from "@/components/glaze/ui/field";
import { NumberInput } from "@/components/glaze/ui/number-input";
import { Switch } from "@/components/glaze/ui/switch";

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
    <section aria-label="Recorrência" className="flex flex-col gap-3">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel>Repetir mensalmente</FieldLabel>
          <FieldDescription>
            Para contas e entradas que se repetem.
          </FieldDescription>
        </FieldContent>
        <Switch
          checked={recurring}
          onCheckedChange={(checked) => onRecurringChange(checked)}
        />
      </Field>
      {recurring && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="occurrences">Por quantos meses?</Label>
          <NumberInput
            id="occurrences"
            className="w-40"
            unit="meses"
            min={2}
            max={120}
            required
            value={Number.isNaN(occurrences) ? null : occurrences}
            onValueChange={(value) => onOccurrencesChange(value ?? Number.NaN)}
            aria-describedby={
              error ? "recurrence-hint occurrences-error" : "recurrence-hint"
            }
            aria-invalid={error ? true : undefined}
          />
          {error && <FieldError id="occurrences-error">{error}</FieldError>}
          <FieldDescription id="recurrence-hint">
            Inclui o mês da primeira transação. Em meses mais curtos, usamos o
            último dia.
          </FieldDescription>
        </div>
      )}
    </section>
  );
}
