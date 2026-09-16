import type { ErrorComponentProps } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="route-error" role="alert">
      <h1>Algo deu errado.</h1>
      <p>
        {error instanceof Error
          ? error.message
          : "Não foi possível carregar esta parte do orçamento."}
      </p>
      <button
        className="primary-button"
        onClick={() => {
          router.invalidate();
          reset();
        }}
      >
        Tentar novamente
      </button>
    </div>
  );
}
