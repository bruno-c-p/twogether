import { z } from "zod/mini";

const HEX64 = /^[0-9a-f]{64}$/;

export const inviteTokenSchema = z
  .string({ error: "Convite inválido. Peça um novo link." })
  .check(z.regex(HEX64, { error: "Convite inválido. Peça um novo link." }));

export const nameSchema = z
  .string({ error: "Conte como você quer aparecer no orçamento." })
  .check(
    z.trim(),
    z.minLength(1, { error: "Conte como você quer aparecer no orçamento." }),
    z.maxLength(50, { error: "Use no máximo 50 caracteres." }),
  );

export const nameFormSchema = z.object({ name: nameSchema });

export const inviteFormSchema = z.object({ invite: inviteTokenSchema });
