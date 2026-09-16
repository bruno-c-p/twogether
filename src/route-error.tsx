import type { ErrorComponentProps } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import chrome from "@/src/chrome.module.css";

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className={chrome.routeError} role="alert">
      <h1>Algo deu errado.</h1>
      <p>
        {error instanceof Error
          ? error.message
          : "Não foi possível carregar esta parte do orçamento."}
      </p>
      <button
        className={chrome.primaryButton}
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
