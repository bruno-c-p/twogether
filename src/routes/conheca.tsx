import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/features/landing/components/landing-page/landing-page";
import { meta } from "@/features/landing/content";

export const Route = createFileRoute("/conheca")({
  head: () => ({
    meta: [
      { title: meta.title },
      { name: "description", content: meta.description },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:site_name", content: "twogether" },
      { property: "og:title", content: meta.title },
      { property: "og:description", content: meta.description },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LandingPage,
});
