import { createHash } from "node:crypto";
export interface MagicLinkMessage {
  email: string;
  token: string;
  invite?: string;
}
export type MagicLinkSender = (message: MagicLinkMessage) => Promise<void>;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
export function magicLinkEmail(url: string) {
  return {
    subject: "Seu link para o twogether",
    text: `Seu orçamento a dois está aqui.\n\nAbra seu link para continuar:\n${url}\n\nVálido por 15 minutos e uma única vez. Não compartilhe este link. Se não pediu este e-mail, pode ignorá-lo.`,
    html: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f7f8f3;font-family:Arial,sans-serif;color:#263d32"><table role="presentation" style="width:100%;padding:40px 16px"><tr><td align="center"><table role="presentation" style="max-width:460px;width:100%;background:#fff;border-radius:20px;padding:32px"><tr><td><p style="font-size:28px;font-weight:700;letter-spacing:-1px;margin:0 0 36px">twogether.</p><h1 style="font-size:28px;line-height:1.2">Seu orçamento a dois<br>está aqui.</h1><p style="font-size:15px;line-height:1.6;color:#718168">Sem senha, sem complicar. Use o botão abaixo para continuar.</p><p style="margin:30px 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:16px 24px;background:#173f34;color:white;border-radius:10px;text-decoration:none;font-weight:bold">Abrir meu orçamento</a></p><p style="font-size:12px;line-height:1.6;color:#7e8976">Válido por 15 minutos e uma única vez. Não compartilhe este link. Se não pediu este e-mail, pode ignorá-lo.</p></td></tr></table></td></tr></table></body></html>`,
  };
}

export const sendMagicLink: MagicLinkSender = async ({
  email,
  token,
  invite,
}) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const appOrigin = process.env.APP_ORIGIN;
  if (!apiKey || !from || !appOrigin)
    throw new Error(
      "O envio de e-mail ainda não está configurado no servidor.",
    );
  const origin = new URL(appOrigin);
  if (
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    !["https:", "http:"].includes(origin.protocol)
  )
    throw new Error(
      "APP_ORIGIN deve conter apenas a origem pública da aplicação.",
    );
  if (process.env.NODE_ENV === "production" && origin.protocol !== "https:")
    throw new Error("APP_ORIGIN precisa usar HTTPS em produção.");
  const fragment = new URLSearchParams({
    access: token,
    ...(invite ? { convite: invite } : {}),
  });
  const url = `${origin.origin}/#${fragment}`;
  const message = magicLinkEmail(url);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `magic-${createHash("sha256").update(token).digest("hex")}`,
    },
    body: JSON.stringify({ from, to: [email], ...message }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(`Resend recusou o envio (HTTP ${response.status}).`);
};
