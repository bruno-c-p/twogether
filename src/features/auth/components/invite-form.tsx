import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/mini";
import { inviteFormSchema } from "@/lib/account-schemas";
import { inviteToken } from "@/features/auth/invite-token";
import { Button } from "@/components/glaze/ui/button";
import {
  Field,
  FieldError,
  FieldLabel,
  Form,
} from "@/components/glaze/ui/field";
import { Input } from "@/components/glaze/ui/input";

// People paste the whole link; the token inside it is what gets checked.
const pastedInviteSchema = z.object({
  invite: z.pipe(
    z.pipe(z.string(), z.transform(inviteToken)),
    inviteFormSchema.shape.invite,
  ),
});

export function InviteForm({
  busy,
  onJoin,
}: {
  busy: boolean;
  onJoin: (invite: string) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(pastedInviteSchema),
    defaultValues: { invite: "" },
  });

  const error = errors.invite?.message;

  return (
    <Form
      onSubmit={(event) =>
        void handleSubmit((values) => onJoin(values.invite))(event)
      }
    >
      <Field invalid={Boolean(error)}>
        <FieldLabel>Link de convite</FieldLabel>
        <Input
          {...register("invite")}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="Cole o link do seu par"
          required
          aria-describedby={error ? "invite-error" : undefined}
          aria-invalid={error ? true : undefined}
        />
        {error && (
          <FieldError id="invite-error" role="alert">
            {error}
          </FieldError>
        )}
      </Field>
      <Button type="submit" variant="secondary" disabled={busy}>
        Aceitar convite
      </Button>
    </Form>
  );
}
