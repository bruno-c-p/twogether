import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";
import { rateLimitMiddleware } from "@/server/middleware";
import { RATE_LIMIT_WINDOW_SECONDS } from "@/server/rate-limit.server";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const rateLimitHeadersMiddleware = createMiddleware().server(
  async ({ next }) => {
    const result = await next();

    if (result.response.status === 429)
      result.response.headers.set(
        "Retry-After",
        String(RATE_LIMIT_WINDOW_SECONDS),
      );

    return result;
  },
);

const securityHeadersMiddleware = createMiddleware().server(
  async ({ next }) => {
    const result = await next();
    result.response.headers.set(
      "Content-Security-Policy",
      "base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
    );
    result.response.headers.set(
      "Permissions-Policy",
      "camera=(), geolocation=(), microphone=(), payment=()",
    );
    result.response.headers.set(
      "Referrer-Policy",
      "strict-origin-when-cross-origin",
    );
    result.response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000",
    );
    result.response.headers.set("X-Content-Type-Options", "nosniff");
    result.response.headers.set("X-Frame-Options", "DENY");

    return result;
  },
);

const privateNoStoreMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  result.response.headers.set("Cache-Control", "private, no-store");

  return result;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [rateLimitMiddleware],
  requestMiddleware: [
    clerkMiddleware(),
    csrfMiddleware,
    rateLimitHeadersMiddleware,
    securityHeadersMiddleware,
    privateNoStoreMiddleware,
  ],
}));
