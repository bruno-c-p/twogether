// Deliberately a single hand-rolled endpoint instead of one createServerFn
// per action: every command shares the same pipeline (origin check, streaming
// body cap, session cookie rotation, full-snapshot response), which server
// functions would force into per-action wrappers. The tradeoff is losing
// wire-level type safety, so all input is validated in the store.
import { RequestError, type BudgetStore } from "../services/shared.server";
import {
  getBudgetStore,
  readSessionToken,
  sessionCookie,
} from "./budget-store.server";

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
    const session = readSessionToken(request);
    if (
      request.method !== "GET" &&
      (request.headers.get("origin") !== origin ||
        !request.headers.get("content-type")?.startsWith("application/json"))
    )
      throw new RequestError("Origem da requisição inválida.", 403);
    const db = database ?? getBudgetStore();
    if (request.method === "GET")
      return new Response(
        JSON.stringify({ snapshot: await db.snapshot(session) }),
        { headers },
      );
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
        `${sessionCookie}=${result.session ?? ""}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${result.session ? 30 * 86400 : 0}${origin.startsWith("https:") ? "; Secure" : ""}`,
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
