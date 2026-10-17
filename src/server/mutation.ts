import type { z } from "zod";
import type { UserRow } from "@/server/db.server";
import { parseInput } from "@/server/action-input";

export type Gate = "auth" | "household";

// `householdId?: never` makes an auth mutation behind householdMiddleware,
// or a household one behind authMiddleware, fail to compile at serve().
export type ActorFor<G extends Gate> = G extends "household"
  ? { user: UserRow; householdId: string }
  : { user: UserRow; householdId?: never };

export interface Mutation<
  G extends Gate,
  Store,
  Input,
  Result,
  Optimistic,
  Name extends string = string,
  RawInput = Input,
> {
  readonly name: Name;
  readonly gate: G;
  readonly parse: (input: RawInput, fail?: (message: string) => never) => Input;
  readonly run: (
    store: Store,
    actor: ActorFor<G>,
    input: Input,
  ) => Promise<Result>;
  readonly optimistic: Optimistic;
}

export type InputOf<M> = M extends {
  parse: (...args: never[]) => infer Input;
}
  ? Input
  : never;

export type ResultOf<M> = M extends {
  run: (...args: never[]) => Promise<infer Result>;
}
  ? Result
  : never;

// What the optimistic update needs beyond the wire input, such as the
// deleted row a restore puts back. It travels as run()'s second argument and
// never reaches the server.
export type ExtraOf<M> = M extends { optimistic: (...args: infer P) => object }
  ? P extends [unknown, unknown, infer Extra]
    ? Extra
    : undefined
  : undefined;

export type ServerActions<Registry> = {
  readonly [K in keyof Registry]: InputOf<Registry[K]> extends undefined
    ? () => Promise<ResultOf<Registry[K]>>
    : (opts: { data: InputOf<Registry[K]> }) => Promise<ResultOf<Registry[K]>>;
};

export function mutations<Store, Snapshot = never>() {
  function define<
    Name extends string,
    G extends Gate,
    Input,
    RawInput,
    Result,
    Optimistic extends
      | ((snapshot: Snapshot, input: NoInfer<Input>, extra: never) => Snapshot)
      | undefined = undefined,
  >(
    name: Name,
    spec: {
      gate: G;
      schema: z.ZodType<Input, RawInput>;
      run: (
        store: Store,
        actor: ActorFor<G>,
        input: NoInfer<Input>,
      ) => Promise<Result>;
      optimistic?: Optimistic;
    },
  ): Mutation<G, Store, Input, Result, Optimistic, Name, RawInput> {
    return {
      name,
      gate: spec.gate,
      run: spec.run,
      parse: (input, fail) => parseInput(spec.schema, input, fail),
      // SAFETY: Optimistic is inferred from spec.optimistic and defaults to
      // undefined exactly when the field is omitted.
      optimistic: spec.optimistic as Optimistic,
    };
  }

  function defineCommand<Name extends string, G extends Gate, Result>(
    name: Name,
    spec: {
      gate: G;
      run: (store: Store, actor: ActorFor<G>) => Promise<Result>;
    },
  ): Omit<Mutation<G, Store, undefined, Result, undefined, Name>, "parse"> {
    return { name, gate: spec.gate, run: spec.run, optimistic: undefined };
  }

  return { define, defineCommand };
}
