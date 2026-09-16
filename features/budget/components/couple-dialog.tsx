import { useState } from "react";
import { Copy } from "lucide-react";
import type { BudgetController } from "@/features/budget/hooks/use-budget";
import { Button } from "@/src/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/src/ui/dialog";
import { FieldHint, FormError, FormStack, Note } from "@/src/ui/field";
import styles from "@/features/budget/components/couple-dialog.module.css";

export function CoupleDialog({
  budget,
  onClose,
}: {
  budget: BudgetController;
  onClose: () => void;
}) {
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  return (
    <Dialog labelledBy="couple-title" narrow onClose={onClose}>
      <DialogContent>
        <DialogHeader
          onClose={onClose}
          closeLabel="Fechar nosso espaço"
        >
          <h2 id="couple-title">Nosso espaço</h2>
        </DialogHeader>
        <p className={styles.intro}>
          Tudo aqui é dos dois. Ambos podem ver e editar contas, transações,
          tags e percentuais.
        </p>
        <div className={styles.coupleMembers}>
          {budget.household?.members.map((member) => (
            <div className={styles.coupleMember} key={member.id}>
              <span className={styles.avatar}>
                {member.name.slice(0, 1).toUpperCase()}
              </span>
              <strong>{member.name}</strong>
              <span>{member.id === budget.user?.id ? "Você" : "Seu par"}</span>
            </div>
          ))}
        </div>
        {budget.household?.members.length === 1 ? (
          <FormStack>
            <p>
              Falta seu par. Gere um convite e compartilhe o link com essa
              pessoa.
            </p>
            <Button
              disabled={budget.busy}
              onClick={async () => {
                const result = await budget.command({ action: "invite" });
                if (result?.inviteToken) {
                  setLink(
                    `${window.location.origin}/?convite=${result.inviteToken}`,
                  );
                  setCopied(false);
                  setCopyError("");
                }
              }}
            >
              {link ? "Gerar novo convite" : "Gerar convite"}
            </Button>
            {link && (
              <>
                <label>
                  Link para seu par
                  <input
                    readOnly
                    value={link}
                    onFocus={(event) => event.target.select()}
                  />
                </label>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link);
                      setCopied(true);
                      setCopyError("");
                    } catch {
                      setCopyError("Selecione e copie o link acima.");
                    }
                  }}
                >
                  <Copy size={16} />
                  {copied ? "Link copiado" : "Copiar convite"}
                </Button>
                <FieldHint>
                  Expira em 48 horas. Um novo convite invalida o anterior.
                </FieldHint>
                {copyError && <p role="status">{copyError}</p>}
              </>
            )}
            <Button
              variant="text"
              disabled={budget.busy}
              onClick={async () => {
                if (await budget.command({ action: "revoke-invite" })) {
                  setLink("");
                  setCopyError("Convites anteriores cancelados.");
                }
              }}
            >
              Cancelar convites pendentes
            </Button>
            {!link && copyError && <p role="status">{copyError}</p>}
          </FormStack>
        ) : (
          <Note>Vocês dois já estão aqui. O espaço está completo.</Note>
        )}
        {budget.error && <FormError>{budget.error}</FormError>}
        <DialogFooter className={styles.footer}>
          <span className={styles.email}>{budget.user?.email}</span>
          <Button
            variant="text"
            className={styles.logout}
            disabled={budget.busy}
            onClick={() => budget.command({ action: "logout" })}
          >
            Sair da conta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
