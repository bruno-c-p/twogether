import { createServerFn } from "@tanstack/react-start";
import {
  householdMutations as defs,
  type HouseholdActions,
} from "@/features/household/actions/mutations";
import { authMiddleware, householdMiddleware } from "@/server/middleware";
import { serve } from "@/server/serve.server";

// The Start compiler only extracts a top-level `const x = createServerFn()`,
// so each mutation stays its own statement.

const createHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(serve(defs.createHousehold));

const joinHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(defs.joinHousehold.parse)
  .handler(serve(defs.joinHousehold));

const createInvite = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .handler(serve(defs.createInvite));

const revokeInvite = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .handler(serve(defs.revokeInvite));

export const householdActions: HouseholdActions = {
  createHousehold,
  joinHousehold,
  createInvite,
  revokeInvite,
};
