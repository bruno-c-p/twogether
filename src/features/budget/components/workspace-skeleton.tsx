import { Skeleton } from "@/components/glaze/ui/skeleton";
import { Brand } from "@/components/app/brand";
import { cn } from "@/lib/glaze/utils";

const cards = [
  ["balance", "h-66"],
  ["totals", "h-66"],
  ["budget", "h-55"],
  ["latest", "h-55"],
] as const;

export function WorkspaceSkeleton() {
  return (
    <div className="min-h-dvh bg-page text-text-1">
      <span role="status" className="sr-only">
        Carregando orçamento…
      </span>
      <header className="border-b border-line-faint bg-page">
        <div className="mx-auto flex h-16 w-full max-w-360 items-center px-4 sm:px-6 xl:px-10">
          <Brand mark />
        </div>
      </header>
      <div className="mx-auto w-full max-w-360 px-4 pt-6 sm:px-6 lg:pt-8 xl:px-10">
        <Skeleton className="mb-6 h-8 w-44" />
        <div className="grid grid-cols-1 gap-3 sm:gap-5 lg:grid-cols-2">
          {cards.map(([id, height]) => (
            <Skeleton key={id} className={cn("rounded-shell", height)} />
          ))}
        </div>
      </div>
    </div>
  );
}
