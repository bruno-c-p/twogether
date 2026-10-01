import { useState, type FormEvent } from "react";
import { parsePhrase, type PhraseDraft } from "@/features/budget/domain/phrase";
import type { BankAccount } from "@/features/budget/domain/types";

// Text and parse error for a "describe what happened" input. A phrase that
// parses clears the field and hands its draft on; typing clears the error.
export function usePhraseInput(
  accounts: BankAccount[],
  onParsed: (draft: PhraseDraft) => void,
) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function change(value: string) {
    setText(value);
    setError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = parsePhrase(text, accounts);

    if ("error" in result) {
      setError(result.error);

      return;
    }

    setError("");
    setText("");
    onParsed(result.draft);
  }

  return { text, error, change, submit };
}
