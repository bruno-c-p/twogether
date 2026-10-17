import { createServerFn } from "@tanstack/react-start";
import {
  authMutations as defs,
  type AuthActions,
} from "@/features/auth/actions/mutations";
import { authMiddleware } from "@/server/middleware";
import { serve } from "@/server/serve.server";

export { loadSession } from "@/features/auth/actions/load-session";

// The Start compiler only extracts a top-level `const x = createServerFn()`,
// so each mutation stays its own statement.

const setName = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(defs.setName.parse)
  .handler(serve(defs.setName));

export const authActions: AuthActions = { setName };
