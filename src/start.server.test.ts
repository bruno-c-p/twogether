import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import {
  getResponseStatus,
  requestHandler,
} from "@tanstack/react-start/server";
import { runWithStartContext } from "@tanstack/start-storage-context";
import { z } from "zod";
import { startInstance } from "@/start";
import { householdMiddleware } from "@/server/middleware";
import { retryAfterFor } from "@/server/rate-limit.server";
import {
  RATE_LIMITED_MESSAGE,
  UNEXPECTED_MESSAGE,
} from "@/server/request-error";

const NO_HOUSEHOLD = "Crie um orçamento ou aceite um convite.";

const replySchema = z.object({ message: z.string().nullable() });

const executedSchema = z.object({ error: z.unknown() });

process.env.BUDGET_DATABASE_PATH = ":memory:";

process.env.CLERK_SECRET_KEY ||= "sk_test_middleware";

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

const reported = spyOn(console, "error").mockImplementation(() => {});

afterEach(() => {
  reported.mockClear();
});

// Runs the server fn the way a /_serverFn request does: inside the request
// event and the Start context, with the session Clerk's middleware resolved.
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

    expect(result.status).toBe(200);
    expect(result.message).toBe(UNEXPECTED_MESSAGE);
    expect(reported).toHaveBeenCalledTimes(1);
  });
});
