import { useUser, ClerkProvider } from "@clerk/tanstack-react-start";
import { ptBR } from "@clerk/localizations";
import { useRef } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { PostHogProvider, usePostHog } from "posthog-js/react";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import stylesheet from "@/styles.css?url";
import "virtual:uno.css";
import { NotFoundPage, RouteError } from "@/components/route-error/route-error";
import { themeScript } from "@/features/theme";
import { Toaster } from "@/components/ui/toaster";
import { parseClientEnv } from "@/lib/env";
import { browserTimeZone, rememberTimeZone } from "@/lib/time-zone";
import { syncIdentity } from "@/lib/posthog-identity";
import { useBrowserSync } from "@/lib/use-browser-sync";

const clientEnv = parseClientEnv(import.meta.env, { dev: import.meta.env.DEV });

const posthogApiKey = clientEnv.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;

const posthogHost = clientEnv.VITE_PUBLIC_POSTHOG_HOST;

function TimeZoneCookie() {
  useBrowserSync(["time-zone"], () => rememberTimeZone(browserTimeZone()));

  return null;
}

function PostHogIdentity() {
  const posthog = usePostHog();
  const { isLoaded, user } = useUser();
  const identifiedUserId = useRef<string | null>(null);
  const userId = user?.id;
  const email = user?.primaryEmailAddress?.emailAddress;
  const name = user?.fullName;

  useBrowserSync(
    ["posthog-identity", userId, email, name],
    () => {
      identifiedUserId.current = syncIdentity(
        posthog,
        identifiedUserId.current,
        { isLoaded, userId, email, name },
      );
    },
    isLoaded,
  );

  return null;
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  errorComponent: RouteError,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
      },
      { title: "twogether — Orçamento a dois" },
      {
        name: "description",
        content: "Organize transações e metas em um orçamento pessoal.",
      },
      { name: "theme-color", content: "#f2f2f4" },
      { name: "color-scheme", content: "light dark" },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "default",
      },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "twogether" },
    ],
    links: [
      { rel: "stylesheet", href: stylesheet },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400..800&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ClerkProvider
          afterSignOutUrl="/entrar"
          localization={ptBR}
          appearance={{
            variables: {
              colorPrimary: "var(--brand)",
              colorForeground: "var(--text)",
              colorMutedForeground: "var(--text-muted)",
              colorBackground: "var(--surface)",
              colorInput: "var(--surface)",
              colorInputForeground: "var(--text)",
              colorDanger: "var(--danger)",
              borderRadius: "10px",
              fontFamily: '"Inter Tight", sans-serif',
              fontSize: "14px",
            },
            // Clerk fades colorBorder to ~5% alpha; text fields need a 3:1 edge.
            elements: {
              formFieldInput: "!shadow-[inset_0_0_0_1px_var(--line-strong)]",
            },
          }}
        >
          <NuqsAdapter>
            <TimeZoneCookie />
            {posthogApiKey && posthogHost ? (
              <PostHogProvider
                apiKey={posthogApiKey}
                options={{
                  api_host: posthogHost,
                  defaults: "2025-05-24",
                  capture_exceptions: true,
                  debug: import.meta.env.DEV,
                  tracing_headers:
                    typeof window !== "undefined"
                      ? [window.location.hostname]
                      : [],
                }}
              >
                <PostHogIdentity />
                <Outlet />
              </PostHogProvider>
            ) : (
              <Outlet />
            )}
          </NuqsAdapter>
          <Toaster />
          <Scripts />
        </ClerkProvider>
      </body>
    </html>
  ),
  notFoundComponent: NotFoundPage,
});
