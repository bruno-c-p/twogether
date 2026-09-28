import { isRedirect } from "@tanstack/react-router";
import { setResponseStatus } from "@tanstack/react-start/server";
import { reportError } from "@/lib/errors";
import type {
  MutationErrorCode,
  MutationResult,
} from "@/server/mutation-result";

export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code: MutationErrorCode = "invalid",
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

export async function runMutation(
  fn: () => Promise<void>,
): Promise<MutationResult>;

export async function runMutation<T extends object>(
  fn: () => Promise<T>,
): Promise<MutationResult<T>>;

export async function runMutation<T extends object>(
  fn: () => Promise<T | void>,
): Promise<MutationResult<T> | MutationResult> {
  try {
    const value = await fn();

    return value ? { ok: true, ...value } : { ok: true };
  } catch (error) {
    if (
      error instanceof RequestError &&
      error.status !== 401 &&
      error.status < 500
    )
      return { ok: false, code: error.code, message: error.message };
    throwHttpError(error);
  }
}
