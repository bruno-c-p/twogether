import { inviteTokenSchema } from "@/lib/account-schemas";
import { inputSchema } from "@/server/action-input";
import { mutations, type ServerActions } from "@/server/mutation";
import type { Store } from "@/server/store.server";

const { define, defineCommand } = mutations<Store>();

const joinHouseholdSchema = inputSchema({ token: inviteTokenSchema });

export const householdMutations = {
  createHousehold: defineCommand("createHousehold", {
    gate: "auth",
    run: (store, actor) => store.createHousehold(actor.user),
  }),
  joinHousehold: define("joinHousehold", {
    gate: "auth",
    schema: joinHouseholdSchema,
    run: (store, actor, input) => store.joinHousehold(actor.user, input.token),
  }),
  createInvite: defineCommand("createInvite", {
    gate: "household",
    run: (store, actor) => store.createInvite(actor.householdId),
  }),
  revokeInvite: defineCommand("revokeInvite", {
    gate: "household",
    run: (store, actor) => store.revokeInvite(actor.householdId),
  }),
};

export type HouseholdActions = ServerActions<typeof householdMutations>;
