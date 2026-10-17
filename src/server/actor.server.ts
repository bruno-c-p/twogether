import type { UserRow } from "@/server/db.server";
import type { ActorFor } from "@/server/mutation";
import { consumeRateLimit } from "@/server/rate-limit.server";
import { RATE_LIMITED_MESSAGE, RequestError } from "@/server/request-error";

const NO_HOUSEHOLD = "Crie um orçamento ou aceite um convite.";

export function householdActor(user: UserRow): ActorFor<"household"> {
  if (!user.household_id) throw new RequestError(NO_HOUSEHOLD);

  return { user, householdId: user.household_id };
}

export function assertWritable(key: string) {
  const verdict = consumeRateLimit(key);

  if (!verdict.ok)
    throw new RequestError(
      RATE_LIMITED_MESSAGE,
      429,
      verdict.retryAfterSeconds,
    );
}
