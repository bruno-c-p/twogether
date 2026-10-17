import { z } from "zod";

const HEX64 = /^[0-9a-f]{64}$/;

export const inviteTokenSchema = z
  .string({ error: "Convite inválido. Peça um novo link." })
  .regex(HEX64, { error: "Convite inválido. Peça um novo link." });

export const nameSchema = z
  .string({ error: "Conte como você quer aparecer no orçamento." })
  .trim()
  .min(1, { error: "Conte como você quer aparecer no orçamento." })
  .max(50, { error: "Use no máximo 50 caracteres." });

export const nameFormSchema = z.object({ name: nameSchema });

export const inviteFormSchema = z.object({ invite: inviteTokenSchema });
