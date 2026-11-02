import { cn } from "@/lib/glaze/utils";

export function AppFooter({ className }: { className?: string } = {}) {
  return (
    <footer
      className={cn(
        "mx-auto flex w-full max-w-360 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-8 type-caption text-text-2 sm:px-6 xl:px-10",
        className,
      )}
    >
      <span className="type-label">twogether.</span>
      <span>Orçamento a dois, com leveza.</span>
    </footer>
  );
}
