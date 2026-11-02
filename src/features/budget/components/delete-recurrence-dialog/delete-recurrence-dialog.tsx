import { useForm, useWatch } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/glaze/ui/alert";
import {
  Dialog,
  DialogAction,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/glaze/ui/dialog";
import { FieldLegend, FieldSet, FormStatus } from "@/components/glaze/ui/field";
import {
  RadioGroup,
  RadioGroupOption,
} from "@/components/glaze/ui/radio-group";
import type { Transaction } from "@/features/budget/domain/types";

interface Props {
  open: boolean;
  transaction: Transaction | null;
  count: number;
  busy: boolean;
  error: string;
  onClose: () => void;
  onDelete: (following: boolean) => Promise<void>;
}

export function DeleteRecurrenceDialog({
  open,
  transaction,
  count,
  busy,
  error,
  onClose,
  onDelete,
}: Props) {
  return (
    <Dialog
      role="alertdialog"
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Excluir transação</DialogTitle>
          <DialogDescription>{transaction?.description}</DialogDescription>
        </DialogHeader>
        <DeleteChoice
          count={count}
          busy={busy}
          error={error}
          onDelete={onDelete}
        />
      </DialogContent>
    </Dialog>
  );
}

// Mounted with the dialog's content, so every open starts on "only this one".
function DeleteChoice({
  count,
  busy,
  error,
  onDelete,
}: Pick<Props, "count" | "busy" | "error" | "onDelete">) {
  const { control, setValue } = useForm<{ scope: "one" | "following" }>({
    defaultValues: { scope: "one" },
  });

  const following = useWatch({ control, name: "scope" }) === "following";

  return (
    <>
      <DialogBody>
        <FieldSet disabled={busy}>
          <FieldLegend variant="label">O que você deseja excluir?</FieldLegend>
          <RadioGroup
            name="delete-scope"
            value={following ? "following" : "one"}
            onValueChange={(next) =>
              setValue("scope", next === "following" ? "following" : "one")
            }
          >
            <RadioGroupOption
              value="one"
              label="Só esta transação"
              description="As outras ocorrências serão mantidas."
            />
            {count > 1 && (
              <RadioGroupOption
                value="following"
                label="Esta e as seguintes"
                description={`${count} transações desta recorrência.`}
              />
            )}
          </RadioGroup>
        </FieldSet>
        {following && (
          <Alert status="warn">
            <AlertDescription>
              As anteriores serão mantidas. Esta exclusão não pode ser desfeita.
            </AlertDescription>
          </Alert>
        )}
        {error && <FormStatus status="fail">{error}</FormStatus>}
      </DialogBody>
      <DialogFooter>
        <DialogClose disabled={busy}>Cancelar</DialogClose>
        <DialogAction
          variant="destructive"
          pending={busy}
          pendingLabel="Excluindo…"
          onClick={() => void onDelete(following)}
        >
          {following ? `Excluir ${count} transações` : "Excluir transação"}
        </DialogAction>
      </DialogFooter>
    </>
  );
}
