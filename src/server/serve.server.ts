import type { ActorFor, Gate, Mutation } from "@/server/mutation";
import { getStore, type Store } from "@/server/store.server";

export function serve<G extends Gate, Input, Result>(
  mutation: Mutation<G, Store, Input, Result, unknown>,
) {
  return ({ data, context }: { data: Input; context: ActorFor<G> }) =>
    mutation.run(getStore(), context, data);
}
