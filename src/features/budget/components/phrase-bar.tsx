import { useState, useSyncExternalStore, type FormEvent } from "react";
import {
  PHRASE_EXAMPLES,
  parsePhrase,
  type PhraseDraft,
} from "@/features/budget/domain/phrase";
import type { BankAccount } from "@/features/budget/domain/types";
import { cx } from "@/lib/cx";

const NARROW = "(max-width: 619.9px)";

function subscribeNarrow(notify: () => void) {
  const query = window.matchMedia(NARROW);

  query.addEventListener("change", notify);

  return () => query.removeEventListener("change", notify);
}

function useNarrow() {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

export function PhraseBar({
  accounts,
  disabled,
  onParsed,
}: {
  accounts: BankAccount[];
  disabled: boolean;
  onParsed: (draft: PhraseDraft) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const narrow = useNarrow();

  function run(phrase: string) {
    const result = parsePhrase(phrase, accounts);

    if ("error" in result) {
      setError(result.error);

      return;
    }

    setError("");
    setText("");
    onParsed(result.draft);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(text);
  }

  return (
    <section aria-label="Registrar com uma frase" className="mb-[18px]">
      <form
        onSubmit={submit}
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
          aria-label="Registrar com uma frase"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "phrase-error" : undefined}
          className="flex-1 min-w-0 border-0 outline-none bg-transparent text-text text-[15px] h-[38px]"
          placeholder={
            narrow
              ? "Ex.: Gastei 300 de condomínio"
              : "Registrar com uma frase… ex.: Gastei 300 reais de condomínio"
          }
          maxLength={120}
          value={text}
          disabled={disabled}
          onChange={(event) => {
            setText(event.currentTarget.value);
            setError("");
          }}
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
      </form>
      {error && (
        <p id="phrase-error" role="alert" className="text-danger mt-[8px]">
          {error}
        </p>
      )}
      {!text && !error && (
        <div className="flex flex-wrap gap-[8px] mt-[12px]">
          {PHRASE_EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              disabled={disabled}
              onClick={() => run(example)}
              className={cx(
                "border border-solid border-border rounded-full bg-surface cursor-pointer",
                "px-[14px] py-[7px] text-[12px] text-text-muted",
                "hover:border-green hover:text-text disabled:opacity-60",
              )}
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
