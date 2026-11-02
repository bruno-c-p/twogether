import { ClerkProvider } from "@clerk/tanstack-react-start";
import type { ReactNode } from "react";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import geistLatin from "@fontsource/geist/files/geist-latin-400-normal.woff2?url";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import stylesheet from "@/styles.css?url";
import "virtual:uno.css";
// After Uno, so Glaze's utilities win where both emit a class of the same name
// (hidden, flex, px-4) and its responsive variants are not overridden.
import "@/components/glaze/styles.css";
import { NotFoundPage, RouteError } from "@/components/route-error/route-error";
import { themeScript, useThemePreference } from "@/features/theme";
import { AppToaster } from "@/components/ui/toaster";
import { LazyClerkUI } from "@/lib/clerk-ui";
import { GlazePortalProvider } from "@/lib/glaze/portal";
import { parseClientEnv } from "@/lib/env";
import { browserTimeZone, rememberTimeZone } from "@/lib/time-zone";
import { useBrowserSync } from "@/lib/use-browser-sync";

// Fails at startup when the Clerk publishable key is missing.
parseClientEnv(import.meta.env);

// Only Clerk's own screens read these strings, and they appear after
// clerk-js downloads, so the 70 KB of copy stays off the first load.
// ClerkProvider forwards the late prop to clerk-js.
function useClerkLocalization() {
  return useQuery({
    queryKey: ["clerk-localization"],
    queryFn: () =>
      import("@clerk/localizations/pt-BR").then(({ ptBR }) => ptBR),
    staleTime: Infinity,
  }).data;
}

const CLERK_UI = { ClerkUI: LazyClerkUI };

function TimeZoneCookie() {
  useBrowserSync(["time-zone"], () => rememberTimeZone(browserTimeZone()));

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
      { name: "theme-color", content: "#fbfbfa" },
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
      {
        rel: "preload",
        href: geistLatin,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
    ],
  }),
  component: RootDocument,
  notFoundComponent: NotFoundPage,
});

// Keeps data-theme in step with the stored choice and the system setting.
// A leaf, so a preference that differs from the server's re-renders nothing.
function ThemeSync() {
  useThemePreference();

  return null;
}

const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "var(--ink)",
    colorForeground: "var(--text-1)",
    colorMutedForeground: "var(--text-2)",
    colorBackground: "var(--paper)",
    colorInput: "var(--paper)",
    colorInputForeground: "var(--text-1)",
    colorDanger: "var(--fail)",
    borderRadius: "var(--radius-panel)",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
  },
};

// The late localization re-renders only this provider: `children` keeps its
// identity, so React skips the app below it.
function LocalizedClerkProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      afterSignOutUrl="/entrar"
      localization={useClerkLocalization()}
      ui={CLERK_UI}
      appearance={CLERK_APPEARANCE}
    >
      {children}
    </ClerkProvider>
  );
}

function RootDocument() {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="glaze">
        <GlazePortalProvider>
          <LocalizedClerkProvider>
            <NuqsAdapter>
              <TimeZoneCookie />
              <Outlet />
            </NuqsAdapter>
            <ThemeSync />
            <AppToaster />
            <Scripts />
          </LocalizedClerkProvider>
        </GlazePortalProvider>
      </body>
    </html>
  );
}
