import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button/button";
import styles from "@/components/route-error/route-error.module.css";

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className={styles.routeError} role="alert">
      <h1>Algo deu errado.</h1>
      <p>
        {error instanceof Error
          ? error.message
          : "Não foi possível carregar esta parte do orçamento."}
      </p>
      <Button
        onClick={() => {
          void router.invalidate();
          reset();
        }}
      >
        Tentar novamente
      </Button>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <main className={styles.notFound}>
      <h1>Página não encontrada.</h1>
      <Link to="/">Voltar para a visão geral</Link>
    </main>
  );
}
