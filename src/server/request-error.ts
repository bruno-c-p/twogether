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

function errorForLogs(error: unknown) {
  if (!(error instanceof Error)) return typeof error;
  return process.env.NODE_ENV === "production" ? error.name : error;
}

export function throwHttpError(error: unknown): never {
  if (isRedirect(error)) throw error;
  if (error instanceof RequestError) {
    setResponseStatus(error.status);
    throw new Error(error.message);
  }
  reportError(errorForLogs(error), { context: "Budget mutation failed" });
  throw new Error("Não foi possível concluir. Tente novamente.");
}

export async function runMutation<T extends object = Record<string, never>>(
  fn: () => Promise<T | void>,
): Promise<MutationResult<T>> {
  try {
    const value = await fn();
    return { ok: true, ...(value as T) };
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
