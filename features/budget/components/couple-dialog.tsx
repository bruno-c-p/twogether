import { useEffect, useRef, useState } from "react";
import { Copy, X } from "lucide-react";
import type { BudgetController } from "@/features/budget/hooks/use-budget";
import ui from "@/src/ui.module.css";
import styles from "@/features/budget/components/couple-dialog.module.css";

export function CoupleDialog({
  budget,
  onClose,
}: {
  budget: BudgetController;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`${ui.dialog} ${ui.narrow}`}
      aria-labelledby="couple-title"
      onCancel={onClose}
    >
      <div className={ui.dialogContent}>
        <header className={ui.dialogHeader}>
          <h2 id="couple-title">Nosso espaço</h2>
          <button
            className={ui.iconButton}
            aria-label="Fechar nosso espaço"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </header>
        <p className={ui.intro}>
          Tudo aqui é dos dois. Ambos podem ver e editar contas, transações,
          tags e percentuais.
        </p>
        <div className={styles.coupleMembers}>
          {budget.household?.members.map((member) => (
            <div className={styles.coupleMember} key={member.id}>
              <span className={`${ui.avatar} ${styles.memberAvatar}`}>
                {member.name.slice(0, 1).toUpperCase()}
              </span>
              <strong>{member.name}</strong>
              <span>{member.id === budget.user?.id ? "Você" : "Seu par"}</span>
            </div>
          ))}
        </div>
        {budget.household?.members.length === 1 ? (
          <div className={ui.accountForm}>
            <p>
              Falta seu par. Gere um convite e compartilhe o link com essa
              pessoa.
            </p>
            <button
              className={ui.primaryButton}
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
            </button>
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
                <button
                  className={ui.secondaryButton}
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
                </button>
                <p className={ui.accountFootnote}>
                  Expira em 48 horas. Um novo convite invalida o anterior.
                </p>
                {copyError && <p role="status">{copyError}</p>}
              </>
            )}
            <button
              className={ui.textButton}
              disabled={budget.busy}
              onClick={async () => {
                if (await budget.command({ action: "revoke-invite" })) {
                  setLink("");
                  setCopyError("Convites anteriores cancelados.");
                }
              }}
            >
              Cancelar convites pendentes
            </button>
            {!link && copyError && <p role="status">{copyError}</p>}
          </div>
        ) : (
          <p className={ui.invitationNote}>
            Vocês dois já estão aqui. O espaço está completo.
          </p>
        )}
        {budget.error && (
          <p role="alert" className={ui.formError}>
            {budget.error}
          </p>
        )}
        <footer className={`${ui.dialogFooter} ${styles.footer}`}>
          <span className={ui.accountEmail}>{budget.user?.email}</span>
          <button
            className={`${ui.textButton} ${styles.logout}`}
            disabled={budget.busy}
            onClick={() => budget.command({ action: "logout" })}
          >
            Sair da conta
          </button>
        </footer>
      </div>
    </dialog>
  );
}
