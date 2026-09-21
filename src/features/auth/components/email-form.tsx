import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { formText } from "@/features/budget/domain/format";
import {
  emailFormSchema,
  fieldErrors,
} from "@/features/budget/domain/schemas";
import { Button } from "@/components/ui/button/button";
import { FieldError, Form } from "@/components/ui/field/field";

const isDevelopment = import.meta.env.DEV;

export function EmailForm({
  busy,
  onRequest,
}: {
  busy: boolean;
  onRequest: (email: string) => Promise<void>;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = emailFormSchema.safeParse({
      email: formText(new FormData(event.currentTarget), "email"),
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    await onRequest(parsed.data.email);
  }
  return (
    <Form onSubmit={(event) => void submit(event)}>
      <label>
        Seu e-mail
        <input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          placeholder="voce@exemplo.com"
          required
          aria-describedby={errors.email ? "email-error" : undefined}
          aria-invalid={errors.email ? true : undefined}
        />
        <FieldError id="email-error">{errors.email}</FieldError>
      </label>
      <Button disabled={busy}>
        {busy
          ? isDevelopment
            ? "Entrando…"
            : "Enviando…"
          : isDevelopment
            ? "Entrar localmente"
            : "Receber meu link"}
        <ArrowRight size={18} />
      </Button>
    </Form>
  );
}
