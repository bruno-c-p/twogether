import { resolve } from "node:path";
import {
  createBudgetStore,
  RequestError,
  type BudgetStore,
} from "../services/shared.server";

let store: BudgetStore | undefined;
const cookieName = "twogether_session";
export async function handleBudgetRequest(
  request: Request,
  database?: BudgetStore,
) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
  });
  try {
    const origin = process.env.APP_ORIGIN || new URL(request.url).origin;
    const session = request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
    if (
      request.method !== "GET" &&
      (request.headers.get("origin") !== origin ||
        !request.headers.get("content-type")?.startsWith("application/json"))
    )
      throw new RequestError("Origem da requisição inválida.", 403);
    const db =
      database ??
      (store ??= createBudgetStore(
        process.env.BUDGET_DATABASE_PATH || resolve("data/twogether.sqlite"),
      ));
    if (request.method === "GET")
      return new Response(JSON.stringify({ snapshot: db.snapshot(session) }), {
        headers,
      });
    if (request.method !== "POST")
      throw new RequestError("Método inválido.", 405);
    const reader = request.body?.getReader();
    if (!reader) throw new RequestError("Requisição vazia.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2_000_000) {
        await reader.cancel();
        throw new RequestError("Dados muito grandes. Limite de 2 MB.", 413);
      }
      chunks.push(value);
    }
    let input: unknown;
    try {
      input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new RequestError("Requisição inválida.");
    }
    const result = await db.command(input, session);
    if (result.session !== session) {
      headers.set(
        "Set-Cookie",
        `${cookieName}=${result.session ?? ""}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${result.session ? 30 * 86400 : 0}${origin.startsWith("https:") ? "; Secure" : ""}`,
      );
    }
    return new Response(
      JSON.stringify({
        snapshot: result.snapshot,
        inviteToken: result.inviteToken,
      }),
      { headers },
    );
  } catch (error) {
    if (!(error instanceof RequestError))
      console.error("Budget API failed", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof RequestError
            ? error.message
            : "Não foi possível concluir. Tente novamente.",
      }),
      { status: error instanceof RequestError ? error.status : 500, headers },
    );
  }
}
