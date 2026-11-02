import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/features/theme/components/theme-toggle/theme-toggle";
import {
  couple,
  features,
  footer,
  goals,
  settle,
  split,
  statement,
} from "@/features/landing/content";
import { SeamLink } from "@/features/landing/components/seam-link/seam-link";
import { SplitStage } from "@/features/landing/components/split-stage/split-stage";
import { Button } from "@/components/glaze/ui/button";
import { Card, CardContent, CardFooter } from "@/components/glaze/ui/card";
import {
  DataList,
  DataListItem,
  DataListLabel,
  DataListValue,
} from "@/components/glaze/ui/data-list";
import { Status } from "@/components/glaze/ui/status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/glaze/ui/table";

const SECTION = "flex flex-col gap-6 py-10 sm:py-16";

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-page text-text-1">
      <a
        href="#conteudo"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:start-4 focus-visible:top-4 focus-visible:z-(--z-overlay) focus-visible:rounded-pill focus-visible:bg-paper focus-visible:px-4 focus-visible:py-2 focus-visible:type-label focus-visible:focus-ring"
      >
        Pular para o conteúdo
      </a>
      <div className="mx-auto flex w-full max-w-280 flex-col px-4 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4 py-4">
          <Link
            to="/conheca"
            className="type-heading rounded-tag focus-visible:focus-ring"
          >
            twogether.
          </Link>
          <nav aria-label="Página" className="flex items-center gap-1">
            <Button
              render={<a href="#dividir" />}
              nativeButton={false}
              variant="ghost"
              className="max-sm:hidden"
            >
              Como divide
            </Button>
            <Button
              render={<a href="#metas" />}
              nativeButton={false}
              variant="ghost"
              className="max-sm:hidden"
            >
              Metas
            </Button>
            <SeamLink to="/entrar" variant="outline">
              Entrar
            </SeamLink>
          </nav>
        </header>

        <main id="conteudo" tabIndex={-1}>
          <SplitStage />

          <p className="max-w-measure py-10 type-heading text-text-1 sm:py-16">
            {statement}
          </p>

          <section
            id="dividir"
            aria-labelledby="dividir-title"
            className={`${SECTION} lg:grid lg:grid-cols-2 lg:items-start lg:gap-10`}
          >
            <div className="flex flex-col gap-6 lg:sticky lg:top-6">
              <h2 id="dividir-title" className="type-title">
                {settle.title}
              </h2>
              <SettleTicket />
            </div>
            <ol className="flex flex-col gap-6">
              {settle.steps.map((step, index) => (
                <li
                  key={step.title}
                  className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1"
                >
                  <span
                    aria-hidden="true"
                    className="type-heading-sm text-text-2 tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <h3 className="type-heading-sm">{step.title}</h3>
                  <p className="col-start-2 type-body text-text-2">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section id="metas" aria-labelledby="metas-title" className={SECTION}>
            <div className="flex flex-col gap-2">
              <h2 id="metas-title" className="type-title">
                {goals.title}
              </h2>
              <p className="max-w-measure type-body text-text-2">
                {goals.intro}
              </p>
            </div>
            <Table aria-label={goals.example}>
              <TableHeader>
                <TableRow>
                  <TableHead>Meta</TableHead>
                  <TableHead numeric>Percentual</TableHead>
                  <TableHead numeric>Planejado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.bands.map((band) => (
                  <TableRow key={band.id}>
                    <TableCell>{band.name}</TableCell>
                    <TableCell numeric>{band.percent}%</TableCell>
                    <TableCell numeric>R$ {band.planned}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="type-body-sm text-text-2">{goals.example}</p>
          </section>

          <section aria-labelledby="resto-title" className={SECTION}>
            <h2 id="resto-title" className="type-title">
              {features.title}
            </h2>
            <DataList>
              {features.rows.map((row) => (
                <DataListItem key={row.name}>
                  <DataListLabel>{row.name}</DataListLabel>
                  <DataListValue>{row.text}</DataListValue>
                </DataListItem>
              ))}
            </DataList>
          </section>
        </main>

        <footer className="flex flex-col gap-10 py-10 sm:py-16">
          <div className="flex flex-col items-start gap-4">
            <h2 className="type-title">{footer.title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <SeamLink to="/entrar">{footer.cta}</SeamLink>
              <Button
                render={<Link to="/entrar" />}
                nativeButton={false}
                variant="ghost"
                size="lg"
              >
                {footer.signIn}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line-faint pt-4">
            <span className="type-body-sm text-text-2">{footer.tagline}</span>
            <ThemeToggle />
          </div>
        </footer>
      </div>
    </div>
  );
}

// The grocery receipt from the hero, kept beside the steps: where the split
// stands after each one. The steps say the same thing in text.
function SettleTicket() {
  const [splitStatus, openStatus, paidStatus] = settle.status;

  return (
    <Card aria-hidden="true">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="type-label">{split.label}</span>
          <span className="type-heading-sm tabular-nums">R$ {split.total}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 type-body-sm tabular-nums">
          <span className="flex flex-col">
            <span className="text-text-2">{couple.payer}</span>R$ {split.kept}
          </span>
          <span className="flex flex-col items-end">
            <span className="text-text-2">{couple.partner}</span>R$ {split.half}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex-wrap justify-start gap-x-3">
        <Status status="idle">{splitStatus}</Status>
        <Status status="waiting">{openStatus}</Status>
        <Status status="ok">{paidStatus}</Status>
      </CardFooter>
    </Card>
  );
}
