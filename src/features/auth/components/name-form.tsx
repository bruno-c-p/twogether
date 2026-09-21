import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { formText } from "@/features/budget/domain/format";
import {
  fieldErrors,
  nameFormSchema,
} from "@/features/budget/domain/schemas";
import { Button } from "@/components/ui/button";
import { FieldError, Form } from "@/components/ui/field/field";

export function NameForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = nameFormSchema.safeParse({
      name: formText(new FormData(event.currentTarget), "name"),
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    await onSubmit(parsed.data.name);
  }
  return (
    <Form onSubmit={(event) => void submit(event)}>
      <label>
        Seu nome
        <input
          name="name"
          autoComplete="given-name"
          maxLength={50}
          placeholder="Como você quer aparecer?"
          required
          aria-describedby={errors.name ? "name-error" : undefined}
          aria-invalid={errors.name ? true : undefined}
        />
        <FieldError id="name-error">{errors.name}</FieldError>
      </label>
      <Button disabled={busy}>
        Continuar
        <ArrowRight size={18} />
      </Button>
    </Form>
  );
}
