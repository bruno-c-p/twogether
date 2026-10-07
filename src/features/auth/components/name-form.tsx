import { Input } from "@/components/ui/input";
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { formText } from "@/features/budget/domain/format";
import { nameFormSchema } from "@/features/budget/domain/schemas";
import { fieldErrors } from "@/lib/zod-errors";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  FieldLabel,
  FieldRoot,
  Form,
} from "@/components/ui/field/field";

const CONTINUE = (
  <>
    Continuar
    <ArrowRight size={18} />
  </>
);

export function NameForm({
  busy,
  onSubmit,
  defaultName,
  submitLabel = CONTINUE,
  status,
}: {
  busy: boolean;
  onSubmit: (name: string) => Promise<void>;
  defaultName?: string;
  submitLabel?: ReactNode;
  // Confirmation shown next to the button once a save went through; pass
  // it (even empty) to keep the button at its own width beside it.
  status?: string;
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

  const button = (
    <Button type="submit" disabled={busy}>
      {submitLabel}
    </Button>
  );

  return (
    <Form onSubmit={(event) => void submit(event)}>
      <FieldRoot>
        <FieldLabel>
          Seu nome
          <Input
            name="name"
            autoComplete="given-name"
            maxLength={50}
            defaultValue={defaultName}
            placeholder="Como você quer aparecer?"
            required
            aria-describedby={errors.name ? "name-error" : undefined}
            aria-invalid={errors.name ? true : undefined}
          />
          <FieldError id="name-error">{errors.name}</FieldError>
        </FieldLabel>
      </FieldRoot>
      {status === undefined ? (
        button
      ) : (
        <div className="flex items-center gap-4">
          {button}
          {status && (
            <p role="status" className="text-text-muted text-xs">
              {status}
            </p>
          )}
        </div>
      )}
    </Form>
  );
}
