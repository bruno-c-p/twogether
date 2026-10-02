import type { PhraseDraft } from "@/features/budget/domain/phrase";
import type { BankAccount } from "@/features/budget/domain/types";
import { usePhraseInput } from "@/features/budget/hooks/use-phrase-input";
import { cx } from "@/lib/cx";

export function PhraseBar({
  accounts,
  disabled,
  onParsed,
}: {
  accounts: BankAccount[];
  disabled: boolean;
  onParsed: (draft: PhraseDraft) => void;
}) {
  const { text, error, change, submit } = usePhraseInput(accounts, onParsed);

  return (
    <section className="mb-[18px]">
      <form onSubmit={submit}>
        <label
          htmlFor="phrase"
          className="block mb-[8px] text-[13px] font-500 text-text"
        >
          Registrar com uma frase
        </label>
        <div
          className={cx(
            "flex items-center gap-[12px] bg-surface border border-solid border-border",
            "rounded-full py-[8px] pl-[22px] pr-[8px] max-bp620:pl-[16px]",
            "focus-within:border-green",
          )}
        >
          <span
            aria-hidden
            className="w-[8px] h-[8px] rounded-full bg-accent shrink-0"
          />
          <input
            id="phrase"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "phrase-error" : undefined}
            className="flex-1 min-w-0 border-0 outline-none bg-transparent text-text text-[15px] h-[38px]"
            placeholder="Gastei 300 reais de condomínio"
            maxLength={120}
            value={text}
            disabled={disabled}
            onChange={(event) => change(event.currentTarget.value)}
          />
          <button
            type="submit"
            disabled={disabled || !text.trim()}
            className={cx(
              "inline-flex items-center gap-[8px] shrink-0 border-0 cursor-pointer",
              "bg-green text-on-brand rounded-full px-[20px] h-[40px] text-[14px] font-500",
              "hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed",
            )}
          >
            Registrar
            <span aria-hidden className="max-bp620:hidden">
              ↵
            </span>
          </button>
        </div>
      </form>
      {error && (
        <p id="phrase-error" role="alert" className="text-danger mt-[8px]">
          {error}
        </p>
      )}
    </section>
  );
}
