import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { inviteFormSchema } from "@/features/budget/domain/schemas";
import { inviteToken } from "@/features/auth/invite-token";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  FieldLabel,
  FieldRoot,
  Form,
} from "@/components/ui/field/field";

// People paste the whole link; the token inside it is what gets checked.
const pastedInviteSchema = z.object({
  invite: z.string().transform(inviteToken).pipe(inviteFormSchema.shape.invite),
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
      <FieldRoot>
        <FieldLabel>
          Link de convite
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
          <FieldError id="invite-error">{error}</FieldError>
        </FieldLabel>
      </FieldRoot>
      <Button type="submit" variant="secondary" disabled={busy}>
        Aceitar convite
      </Button>
    </Form>
  );
}
