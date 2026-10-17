export const UNEXPECTED_MESSAGE = "Não foi possível concluir. Tente novamente.";

export const RATE_LIMITED_MESSAGE =
  "Muitas alterações em pouco tempo. Aguarde um instante e tente novamente.";

export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function errorForLogs(cause: unknown) {
  if (!(cause instanceof Error)) return "non-Error value";

  return process.env.NODE_ENV === "production" ? cause.name : cause;
}
