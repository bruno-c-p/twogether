import { couple, hero, split } from "@/features/landing/content";
import { SeamLink } from "@/features/landing/components/seam-link/seam-link";
import { Avatar } from "@/components/glaze/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/glaze/ui/card";

// The grocery total split along the seam into two halves, with the cent that
// does not divide kept by the payer.
export function SplitStage() {
  return (
    <section
      aria-labelledby="landing-title"
      className="grid gap-8 py-10 sm:py-16 lg:grid-cols-2 lg:items-center"
    >
      <div className="flex flex-col items-start gap-4">
        <h1 id="landing-title" className="type-title">
          {hero.title}
        </h1>
        <p className="max-w-measure type-body text-text-2">{hero.intro}</p>
        <SeamLink to="/entrar">{hero.cta}</SeamLink>
      </div>

      <figure className="flex flex-col gap-3">
        <p className="sr-only">{hero.summary}</p>
        <Card aria-hidden="true">
          <CardHeader>
            <CardTitle>{split.label}</CardTitle>
            <CardDescription>Dividido com {couple.partner}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="type-title tabular-nums">R$ {split.total}</p>
            <div className="grid grid-cols-2 divide-x divide-dashed divide-line">
              <div className="flex flex-col gap-1 pe-3">
                <span className="flex items-center gap-2 type-body-sm text-text-2">
                  <Avatar name={couple.payer} decorative />
                  {couple.payer} pagou
                </span>
                <span className="type-heading tabular-nums">
                  R$ {split.half}
                </span>
                <span className="type-body-sm text-text-2 tabular-nums">
                  +{split.odd}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1 ps-3 text-end">
                <span className="flex items-center gap-2 type-body-sm text-text-2">
                  {couple.partner} deve
                  <Avatar name={couple.partner} decorative />
                </span>
                <span className="type-heading tabular-nums">
                  R$ {split.half}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <figcaption className="type-body-sm text-text-2">
          {hero.rule}
        </figcaption>
      </figure>
    </section>
  );
}
