import { Landmark, Pencil, Trash2 } from "lucide-react";
import { money } from "@/features/budget/domain/format";
import type { BankAccount } from "@/features/budget/domain/types";
import { Button } from "@/components/ui/button";
import {
  ListRow,
  ListRowActions,
  ListRowIcon,
  ListRowMeta,
  ListRowName,
  ListRowValue,
  listRowAction,
  listRowDelete,
} from "@/features/budget/components/list-row/list-row";

export function AccountRow({
  account,
  used,
  balance,
  busy,
  hidden,
  onEdit,
  onDelete,
}: {
  account: BankAccount;
  used: boolean;
  balance: number;
  busy: boolean;
  hidden: boolean;
  onEdit: (account: BankAccount) => void;
  onDelete: (account: BankAccount) => void;
}) {
  return (
    <ListRow>
      <ListRowIcon>
        <Landmark size={18} />
      </ListRowIcon>
      <div>
        <ListRowName disabled={busy} onClick={() => onEdit(account)}>
          {account.name}
        </ListRowName>
        <ListRowMeta>
          {used ? "Em uso nas transações" : "Nenhuma transação nesta conta"}
        </ListRowMeta>
      </div>
      <ListRowValue tone={balance < 0 ? "negative" : "positive"}>
        {hidden ? "R$ ••••" : money(balance)}
      </ListRowValue>
      <ListRowActions>
        <Button
          variant="icon"
          className={listRowAction}
          disabled={busy}
          aria-label={`Editar ${account.name}`}
          onClick={() => onEdit(account)}
        >
          <Pencil size={15} />
        </Button>
        <Button
          variant="icon"
          className={`${listRowAction} ${listRowDelete}`}
          disabled={busy || used}
          title={
            used
              ? "Exclua ou mova as transações desta conta antes de apagá-la."
              : "Excluir conta"
          }
          aria-label={`Excluir ${account.name}`}
          onClick={() => onDelete(account)}
        >
          <Trash2 size={15} />
        </Button>
      </ListRowActions>
    </ListRow>
  );
}
