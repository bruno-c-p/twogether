import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import {
  getResponseStatus,
  requestHandler,
} from "@tanstack/react-start/server";
import { runWithStartContext } from "@tanstack/start-storage-context";
import { z } from "zod";
import { startInstance } from "@/start";
import { databaseUrl } from "@/server/env.server";
import { householdMiddleware } from "@/server/middleware";
import { retryAfterFor } from "@/server/rate-limit.server";
import {
  RATE_LIMITED_MESSAGE,
  UNEXPECTED_MESSAGE,
} from "@/server/request-error";

const NO_HOUSEHOLD = "Crie um orçamento ou aceite um convite.";

const replySchema = z.object({ message: z.string().nullable() });

const executedSchema = z.object({ error: z.unknown() });

const ENV_KEYS = [
  "BUDGET_DATABASE_PATH",
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "CLERK_SECRET_KEY",
] as const;

const savedEnv = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));

// Write server fns as the budget actions build them. The global
// functionMiddleware from src/start.ts wraps them the way the server does.
const write = createServerFn({ method: "POST" })
  .middleware([householdMiddleware])
  .handler(() => "saved");

// Thrown below errorMiddleware without a RequestError, as a store bug would.
const crash = createMiddleware({ type: "function" }).server(() => {
  throw new Error("database on fire");
});

const broken = createServerFn({ method: "POST" })
  .middleware([crash])
  .handler(() => "never");

const reported = spyOn(console, "error");

// The middleware reaches the process-wide store, so the env must point it at
// memory before the first call, and a Turso URL would win over the path.
beforeAll(() => {
  reported.mockImplementation(() => {});
  process.env.BUDGET_DATABASE_PATH = ":memory:";
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
  process.env.CLERK_SECRET_KEY ||= "sk_test_middleware";
  expect(databaseUrl()).toBe(":memory:");
});

afterEach(() => {
  reported.mockClear();
});

afterAll(() => {
  reported.mockRestore();

  for (const [key, value] of savedEnv)
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
});

// Runs the server fn the way a /_serverFn request does: inside the request
// event and the Start context, with the session Clerk's middleware resolved.
// The context shape is StartStorageContext from @tanstack/start-storage-context,
// as createStartHandler fills it. Request middleware does not run here, so the
// Retry-After header is read from the memo it would copy, not from a response.
async function post(fn: Pick<typeof write, "__executeServer">, userId: string) {
  const request = new Request("http://localhost/_serverFn/write", {
    method: "POST",
  });

  const response = await requestHandler(async () =>
    runWithStartContext(
      {
        startOptions: await startInstance.getOptions(),
        request,
        executedRequestMiddlewares: new Set(),
        contextAfterGlobalMiddlewares: {
          auth: () => ({ userId, tokenType: "session_token" }),
        },
        getRouter: () => {
          throw new Error("server fns never resolve the router");
        },
        handlerType: "serverFn",
      },
      async () => {
        const { error } = executedSchema.parse(
          await fn.__executeServer({
            data: undefined,
            method: "POST",
            context: {},
          }),
        );

        return Response.json(
          { message: error instanceof Error ? error.message : null },
          { status: getResponseStatus() },
        );
      },
    ),
  )(request, {});

  return {
    status: response.status,
    message: replySchema.parse(await response.json()).message,
    retryAfter: retryAfterFor(request),
  };
}

describe("write server fn errors", () => {
  test("a user without a household gets the household message", async () => {
    const result = await post(write, "user_f18_no_household");

    expect(result.status).toBe(400);
    expect(result.message).toBe(NO_HOUSEHOLD);
    expect(reported).not.toHaveBeenCalled();
  });

  test("a rate-limited user gets the rate-limit message and a retry delay", async () => {
    let last = await post(write, "user_f18_limited");

    for (let index = 0; index < 60 && last.status !== 429; index++)
      last = await post(write, "user_f18_limited");

    expect(last.status).toBe(429);
    expect(last.retryAfter).toBeGreaterThan(0);
    expect(last.message).toBe(RATE_LIMITED_MESSAGE);
    expect(reported).not.toHaveBeenCalled();
  });

  test("an unexpected failure goes out generic and is reported once", async () => {
    const result = await post(broken, "user_f18_broken");

    expect(result.message).toBe(UNEXPECTED_MESSAGE);
    expect(reported).toHaveBeenCalledTimes(1);
  });
});
