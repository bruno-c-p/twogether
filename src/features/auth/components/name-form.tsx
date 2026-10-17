import { Input } from "@/components/ui/input";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { nameFormSchema } from "@/lib/account-schemas";
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(nameFormSchema),
    defaultValues: { name: defaultName ?? "" },
  });

  const error = errors.name?.message;

  const button = (
    <Button type="submit" disabled={busy}>
      {submitLabel}
    </Button>
  );

  return (
    <Form
      onSubmit={(event) =>
        void handleSubmit((values) => onSubmit(values.name))(event)
      }
    >
      <FieldRoot>
        <FieldLabel>
          Seu nome
          <Input
            {...register("name")}
            autoComplete="given-name"
            maxLength={50}
            placeholder="Como você quer aparecer?"
            required
            aria-describedby={error ? "name-error" : undefined}
            aria-invalid={error ? true : undefined}
          />
          <FieldError id="name-error">{error}</FieldError>
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
