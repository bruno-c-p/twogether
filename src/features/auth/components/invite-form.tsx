import { Input } from "@/components/ui/input";
import { useState, type FormEvent } from "react";
import { formText } from "@/features/budget/domain/format";
import { inviteFormSchema } from "@/features/budget/domain/schemas";
import { fieldErrors } from "@/lib/zod-errors";
import { inviteToken } from "@/features/auth/invite-token";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  FieldLabel,
  FieldRoot,
  Form,
} from "@/components/ui/field/field";

export function InviteForm({
  busy,
  onJoin,
}: {
  busy: boolean;
  onJoin: (invite: string) => Promise<void>;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = inviteFormSchema.safeParse({
      invite: inviteToken(
        formText(new FormData(event.currentTarget), "invite"),
      ),
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));

      return;
    }

    setErrors({});
    await onJoin(parsed.data.invite);
  }

  return (
    <Form onSubmit={(event) => void submit(event)}>
      <FieldRoot>
        <FieldLabel>
          Link de convite
          <Input
            name="invite"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            placeholder="Cole o link do seu par"
            required
            aria-describedby={errors.invite ? "invite-error" : undefined}
            aria-invalid={errors.invite ? true : undefined}
          />
          <FieldError id="invite-error">{errors.invite}</FieldError>
        </FieldLabel>
      </FieldRoot>
      <Button type="submit" variant="secondary" disabled={busy}>
        Aceitar convite
      </Button>
    </Form>
  );
}
