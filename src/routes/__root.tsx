import { ClerkProvider } from "@clerk/tanstack-react-start";
import { ptBR } from "@clerk/localizations";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import stylesheet from "@/styles.css?url";
import "virtual:uno.css";
import { NotFoundPage, RouteError } from "@/components/route-error/route-error";
import { themeScript } from "@/features/theme";

export const Route = createRootRoute({
  errorComponent: RouteError,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "twogether — Orçamento a dois" },
      {
        name: "description",
        content: "Organize transações, metas e tags em um orçamento pessoal.",
      },
      { name: "theme-color", content: "#173f35" },
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
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;450;500;550;600;650;700&family=Manrope:wght@400;500;600;650;700;750;800&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        <ClerkProvider
          afterSignOutUrl="/entrar"
          localization={ptBR}
          appearance={{
            variables: {
              colorPrimary: "var(--green)",
              colorForeground: "var(--text)",
              colorMutedForeground: "var(--text-muted)",
              colorBackground: "var(--surface)",
              colorInput: "var(--surface)",
              colorInputForeground: "var(--text)",
              colorDanger: "var(--danger)",
              borderRadius: "10px",
              fontFamily: '"DM Sans", sans-serif',
              fontSize: "14px",
            },
          }}
        >
          <Outlet />
          <Scripts />
        </ClerkProvider>
      </body>
    </html>
  ),
  notFoundComponent: NotFoundPage,
});
