import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { nameFormSchema } from "@/lib/account-schemas";
import { Button } from "@/components/glaze/ui/button";
import {
  Field,
  FieldError,
  FieldLabel,
  Form,
  FormActions,
} from "@/components/glaze/ui/field";
import { Input } from "@/components/glaze/ui/input";

export function NameForm({
  busy,
  onSubmit,
  defaultName,
  submitLabel = "Continuar",
  status,
}: {
  busy: boolean;
  onSubmit: (name: string) => Promise<void>;
  defaultName?: string;
  submitLabel?: string;
  // Confirmation shown next to the button once a save went through.
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

  return (
    <Form
      pending={busy}
      onSubmit={(event) =>
        void handleSubmit((values) => onSubmit(values.name))(event)
      }
    >
      <Field invalid={Boolean(error)}>
        <FieldLabel>Seu nome</FieldLabel>
        <Input
          {...register("name")}
          autoComplete="given-name"
          maxLength={50}
          placeholder="Como você quer aparecer?"
          required
          aria-describedby={error ? "name-error" : undefined}
          aria-invalid={error ? true : undefined}
        />
        {error && (
          <FieldError id="name-error" role="alert">
            {error}
          </FieldError>
        )}
      </Field>
      <FormActions>
        <Button type="submit" pending={busy} pendingLabel="Salvando">
          {submitLabel}
        </Button>
        {status && (
          <p role="status" className="type-body-sm text-text-2">
            {status}
          </p>
        )}
      </FormActions>
    </Form>
  );
}
