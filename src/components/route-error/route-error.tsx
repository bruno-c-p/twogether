import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, useRouter } from "@tanstack/react-router";
import { Icon, Retry } from "@/components/glaze/icon";
import { Button, buttonVariants } from "@/components/glaze/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/glaze/ui/empty-state";

const page = "mx-auto grid min-h-dvh w-full max-w-md place-items-center p-4";

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  const description =
    import.meta.env.DEV && error instanceof Error
      ? error.message
      : "Não foi possível carregar esta parte do orçamento.";

  return (
    <div className={page}>
      <Empty reason="error">
        <EmptyHeader>
          <EmptyTitle>Algo deu errado.</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void router.invalidate();
              reset();
            }}
          >
            <Icon icon={Retry} size={12} />
            Tentar novamente
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <main className={page}>
      <Empty reason="no-results">
        <EmptyHeader>
          <EmptyTitle>Página não encontrada.</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Link
            to="/"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Voltar para a visão geral
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  );
}
