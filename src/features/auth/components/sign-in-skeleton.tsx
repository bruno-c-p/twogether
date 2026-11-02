import { Skeleton } from "@/components/glaze/ui/skeleton";

// Clerk's form while its UI downloads: the email label, the field, the
// continue button and the sign-up line.
export function SignInSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Carregando o formulário de acesso…</span>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-(--control) w-full rounded-pill" />
      <Skeleton className="h-(--control) w-full rounded-pill" />
      <Skeleton className="h-3 w-32 self-center" />
    </div>
  );
}
