import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { ActorFor } from "@/server/mutation";
import type { Store } from "@/server/store.server";

type Actor = ActorFor<"household">;

export type WriteSession = {
  store: Store;
  // Rate-limits on first call and resolves the caller's household.
  actor: () => Promise<Actor>;
};

export type ToolRunner = {
  server: McpServer;
  session: () => WriteSession;
  run: (task: () => Promise<object>) => Promise<CallToolResult>;
  rejected: (message: string) => never;
};

type Definition<Name extends string, RawInput, Input, Result> = {
  name: Name;
  parse: (input: RawInput, fail?: (message: string) => never) => Input;
  run: (store: Store, actor: Actor, input: Input) => Promise<Result>;
};

type ToolInputSchema = Record<string, z.core.$ZodType>;

type Spec<Args extends ToolInputSchema, RawInput, Input, Result> = {
  tool: string;
  title: string;
  description: string;
  annotations: ToolAnnotations;
  inputSchema: Args;
  // Does what the app's form does before it sends: patch merges, defaults,
  // checks.
  input: (
    args: z.output<z.ZodObject<Args>>,
    session: WriteSession,
  ) => RawInput | Promise<RawInput>;
  output: (
    session: WriteSession,
    input: Input,
    result: Result,
  ) => Promise<object> | object;
};

export type WriteTool<Name extends string> = ((runner: ToolRunner) => void) & {
  readonly mutation: Name;
};

export function writeTool<
  Name extends string,
  Args extends ToolInputSchema,
  RawInput,
  Input,
  Result,
>(
  definition: Definition<Name, RawInput, Input, Result>,
  spec: Spec<Args, RawInput, Input, Result>,
): WriteTool<Name> {
  const argsSchema = z.object(spec.inputSchema);

  const register = ({ server, session, run, rejected }: ToolRunner) => {
    server.registerTool<ToolInputSchema, ToolInputSchema>(
      spec.tool,
      {
        title: spec.title,
        description: spec.description,
        inputSchema: spec.inputSchema,
        annotations: spec.annotations,
      },
      // The SDK already validated the arguments against inputSchema; parsing
      // again only recovers their type, which its generic callback loses.
      (raw) =>
        run(async () => {
          const current = session();
          const args = argsSchema.parse(raw);

          const draft = await spec.input(args, current);
          // The setup gate and rate limit answer before validation does.
          const actor = await current.actor();
          const input = definition.parse(draft, rejected);
          const result = await definition.run(current.store, actor, input);

          return spec.output(current, input, result);
        }),
    );
  };

  return Object.assign(register, { mutation: definition.name });
}
