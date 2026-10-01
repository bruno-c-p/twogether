import { isRedirect } from "@tanstack/react-router";
import { setResponseStatus } from "@tanstack/react-start/server";
import { reportError } from "@/lib/errors";

export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

function errorForLogs(cause: unknown) {
  if (!(cause instanceof Error)) return "non-Error value";

  return process.env.NODE_ENV === "production" ? cause.name : cause;
}

export function throwHttpError(cause: unknown): never {
  if (isRedirect(cause)) throw cause;

  if (cause instanceof RequestError) {
    setResponseStatus(cause.status);
    throw new Error(cause.message);
  }

  reportError(errorForLogs(cause), { context: "Budget mutation failed" });
  throw new Error("Não foi possível concluir. Tente novamente.");
}
