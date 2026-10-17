import type { UserRow } from "@/server/db.server";
import type { ActorFor } from "@/server/mutation";
import { consumeRateLimit } from "@/server/rate-limit.server";
import { RATE_LIMITED_MESSAGE, RequestError } from "@/server/request-error";

const NO_HOUSEHOLD = "Crie um orçamento ou aceite um convite.";

function reject(message: string, status?: number): never {
  throw new RequestError(message, status);
}

// A server fn middleware passes `fail` to raise its own HTTP error.
export function householdActor(
  user: UserRow,
  fail: (message: string) => never = reject,
): ActorFor<"household"> {
  if (!user.household_id) fail(NO_HOUSEHOLD);

  return { user, householdId: user.household_id };
}

// `limited` gets the wait so the middleware can send Retry-After.
export function assertWritable(
  key: string,
  limited: (retryAfterSeconds: number) => never = () =>
    reject(RATE_LIMITED_MESSAGE, 429),
) {
  const verdict = consumeRateLimit(key);

  if (!verdict.ok) limited(verdict.retryAfterSeconds);
}
