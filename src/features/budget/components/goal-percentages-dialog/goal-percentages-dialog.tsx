import type { FormEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { DEFAULT_PERCENTAGES, GOALS } from "@/features/budget/constants";
import { goalPercentagesSchema } from "@/features/budget/domain/schemas";
import type { GoalPercentages } from "@/features/budget/domain/types";
import { GoalPercentageList } from "@/features/budget/components/goal-percentage-list/goal-percentage-list";
import { Button } from "@/components/glaze/ui/button";
import {
  Dialog,
  DialogAction,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/glaze/ui/dialog";
import { FieldError, FormStatus } from "@/components/glaze/ui/field";
import { sum } from "@/lib/decimal";

const FORM_ID = "goal-percentages-form";

type Props = {
  open: boolean;
  percentages: GoalPercentages;
  // The save is in flight; the caller closes the dialog when it succeeds.
  busy: boolean;
  error: string;
  onSave: (values: GoalPercentages) => Promise<void>;
  onClose: () => void;
};

export function GoalPercentagesDialog({ open, onClose, ...form }: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Divisão da minha renda</DialogTitle>
          <DialogDescription>
            Defina a porcentagem da sua renda destinada a cada meta. A soma deve
            ser 100% e vale para todos os meses. Cada pessoa define seus
            próprios percentuais.
          </DialogDescription>
        </DialogHeader>
        <PercentagesForm {...form} />
      </DialogContent>
    </Dialog>
  );
}

// Mounted with the dialog's content, so every open starts from the saved values.
function PercentagesForm({
  percentages,
  busy,
  error,
  onSave,
}: Omit<Props, "open" | "onClose">) {
  const { control, setValue, reset } = useForm({ defaultValues: percentages });
  const values: GoalPercentages = { ...percentages, ...useWatch({ control }) };
  const parsed = goalPercentagesSchema.safeParse(values);
  const valid = parsed.success;
  const invalidMessage = parsed.success ? "" : parsed.error.issues[0].message;

  const total = sum(
    GOALS.map((goal) =>
      Number.isFinite(values[goal.id]) ? values[goal.id] : 0,
    ),
  );

  function submit(event: FormEvent) {
    event.preventDefault();

    if (!valid || busy) return;
    void onSave(values);
  }

  return (
    <>
      <DialogBody>
        <form id={FORM_ID} onSubmit={submit}>
          <GoalPercentageList
            values={values}
            disabled={busy}
            onChange={(goal, value) => setValue(goal, value)}
          />
        </form>
        <FormStatus
          status={valid ? undefined : "fail"}
          className="tabular-nums"
        >
          Total: {total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
          {!valid && ` · ${invalidMessage}`}
        </FormStatus>
        {error && <FieldError>{error}</FieldError>}
      </DialogBody>
      <DialogFooter>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => reset({ ...DEFAULT_PERCENTAGES })}
        >
          Restaurar padrão
        </Button>
        <DialogAction
          type="submit"
          form={FORM_ID}
          disabled={!valid || busy}
          pending={busy}
        >
          Salvar percentuais
        </DialogAction>
      </DialogFooter>
    </>
  );
}
