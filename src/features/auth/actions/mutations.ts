import { nameSchema } from "@/lib/account-schemas";
import { inputSchema } from "@/server/action-input";
import { mutations, type ServerActions } from "@/server/mutation";
import type { Store } from "@/server/store.server";

const { define } = mutations<Store>();

const setNameSchema = inputSchema({ name: nameSchema });

export const authMutations = {
  setName: define("setName", {
    gate: "auth",
    schema: setNameSchema,
    run: (store, actor, input) => store.setName(actor.user, input.name),
  }),
};

export type AuthActions = ServerActions<typeof authMutations>;
