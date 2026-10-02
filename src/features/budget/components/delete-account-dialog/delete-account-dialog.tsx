import { Trash2 } from "lucide-react";
import type { BankAccount } from "@/features/budget/domain/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDismiss,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog/dialog";
import { Fieldset } from "@/components/ui/field/field";
import styles from "@/features/budget/components/delete-account-dialog/delete-account-dialog.module.css";

export function DeleteAccountDialog({
  account,
  busy,
  onClose,
  onDelete,
}: {
  account: BankAccount;
  busy: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <Dialog
      narrow
      labelledBy="delete-account-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <DialogContent>
        <DialogHeader onClose={onClose} closeDisabled={busy}>
          <h2 id="delete-account-title">Excluir esta conta?</h2>
        </DialogHeader>
        <p className={styles.accountName}>{account.name}</p>
        <Fieldset disabled={busy}>
          <DialogFooter>
            <DialogDismiss autoFocus>Cancelar</DialogDismiss>
            <Button
              type="button"
              className={styles.deleteConfirm}
              onClick={onDelete}
            >
              <Trash2 size={16} />
              {busy ? "Excluindo…" : "Excluir conta"}
            </Button>
          </DialogFooter>
        </Fieldset>
      </DialogContent>
    </Dialog>
  );
}
