import { useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";
import type { PhraseDraft } from "@/features/budget/domain/phrase";
import type { BankAccount } from "@/features/budget/domain/types";
import { usePhraseInput } from "@/features/budget/hooks/use-phrase-input";
import { Dialog } from "@/components/ui/dialog/dialog";
import { cx } from "@/lib/cx";

function PhraseInput({
  accounts,
  onParsed,
  onManual,
}: {
  accounts: BankAccount[];
  onParsed: (draft: PhraseDraft) => void;
  onManual: () => void;
}) {
  const { text, error, change, submit } = usePhraseInput(accounts, onParsed);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  return (
    <div className="grid gap-[8px]">
      {error && (
        <p
          id="register-phrase-error"
          role="alert"
          className="m-0 text-danger text-[13px]"
        >
          {error}
        </p>
      )}
      <form
        onSubmit={submit}
        className={cx(
          "flex items-center gap-[8px] bg-surface border border-solid border-border",
          "rounded-full py-[6px] pl-[18px] pr-[6px] focus-within:border-green",
        )}
      >
        <input
          ref={input}
          aria-label="Descreva o que aconteceu"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "register-phrase-error" : undefined}
          maxLength={120}
          placeholder="Gastei 300 reais de condomínio"
          value={text}
          onChange={(event) => change(event.currentTarget.value)}
          className="flex-1 min-w-0 h-[38px] border-0 bg-transparent outline-none text-text text-[16px]"
        />
        <button
          type="submit"
          aria-label="Enviar frase"
          disabled={!text.trim()}
          className={cx(
            "w-[40px] h-[40px] shrink-0 rounded-full border-0 bg-green text-on-brand",
            "inline-flex items-center justify-center cursor-pointer disabled:opacity-50",
          )}
        >
          <ArrowUp size={18} aria-hidden />
        </button>
      </form>
      <button
        type="button"
        onClick={onManual}
        className="border-0 bg-transparent text-text-muted text-[13px] underline underline-offset-[3px] cursor-pointer p-[4px]"
      >
        Preencher manualmente
      </button>
    </div>
  );
}

export function RegisterSheet({
  accounts,
  onParsed,
  onManual,
  onClose,
}: {
  accounts: BankAccount[];
  onParsed: (draft: PhraseDraft) => void;
  onManual: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      unstyled
      label="Registrar transação"
      onClose={onClose}
      closeOnBackdrop
      className={cx(
        "m-auto p-0 w-[560px] max-w-[calc(100vw_-_28px)] max-h-[calc(100dvh_-_40px)]",
        "bg-page text-text border border-solid border-border rounded-[20px] overflow-y-auto",
        "shadow-[0_24px_60px_rgba(23,63,53,.22)]",
        "backdrop:bg-dialog-backdrop backdrop:backdrop-blur-[5px]",
        "max-bp1000:mx-0 max-bp1000:mb-0 max-bp1000:w-full max-bp1000:max-w-full",
        "max-bp1000:max-h-[92dvh] max-bp1000:rounded-b-none max-bp1000:rounded-t-[22px]",
        "max-bp1000:border-b-0",
      )}
    >
      <div className="p-[22px] max-bp620:p-[16px] grid gap-[14px]">
        <div
          aria-hidden
          className="hidden max-bp1000:block w-[40px] h-[4px] rounded-full bg-border mx-auto"
        />
        <h2 className="m-0 font-heading text-[22px] font-600 tracking-[-.5px]">
          O que aconteceu?
        </h2>
        <PhraseInput
          accounts={accounts}
          onManual={onManual}
          onParsed={onParsed}
        />
      </div>
    </Dialog>
  );
}
