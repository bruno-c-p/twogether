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
import interTightLatin from "@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2?url";
import "@fontsource-variable/inter-tight/wght.css";
import stylesheet from "@/styles.css?url";
import "virtual:uno.css";
import { NotFoundPage, RouteError } from "@/components/route-error/route-error";
import { themeScript, useThemePreference } from "@/features/theme";
import { Toaster } from "@/components/ui/toaster";
import { LazyClerkUI } from "@/lib/clerk-ui";
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
      {
        rel: "preload",
        href: interTightLatin,
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
    colorPrimary: "var(--brand)",
    colorForeground: "var(--text)",
    colorMutedForeground: "var(--text-muted)",
    colorBackground: "var(--surface)",
    colorInput: "var(--surface)",
    colorInputForeground: "var(--text)",
    colorDanger: "var(--danger)",
    borderRadius: "10px",
    fontFamily: '"Inter Tight Variable", sans-serif',
    fontSize: "14px",
  },
  // Clerk fades colorBorder to ~5% alpha; text fields need a 3:1 edge.
  elements: {
    formFieldInput: "!shadow-[inset_0_0_0_1px_var(--line-strong)]",
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
      <body>
        <LocalizedClerkProvider>
          <NuqsAdapter>
            <TimeZoneCookie />
            <Outlet />
          </NuqsAdapter>
          <ThemeSync />
          <Toaster />
          <Scripts />
        </LocalizedClerkProvider>
      </body>
    </html>
  );
}
