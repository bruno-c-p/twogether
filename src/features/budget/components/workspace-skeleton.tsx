import { Brand } from "@/components/ui/brand";
import { cx } from "@/lib/cx";

const cards = [
  ["balance", "h-[264px]"],
  ["totals", "h-[264px]"],
  ["budget", "h-[220px]"],
  ["latest", "h-[220px]"],
] as const;

export function WorkspaceSkeleton() {
  return (
    <div className="min-h-[100dvh]">
      <span role="status" className="sr-only">
        Carregando orçamento…
      </span>
      <header className="h-[63px] border-b border-solid border-border bg-topbar">
        <div className="mx-auto max-w-[1450px] h-full flex items-center px-8 max-bp1190:px-6 max-bp800:px-6 max-bp620:px-4">
          <Brand mark className="text-xl" markClassName="scale-[.8]" />
        </div>
      </header>
      <div className="max-w-[1450px] mx-auto px-10 pt-10 max-bp1190:px-8 max-bp1190:pt-8 max-bp800:px-6 max-bp800:pt-6 max-bp620:px-5 max-bp620:pt-6">
        <div
          aria-hidden="true"
          className="h-[28px] w-[180px] rounded-md bg-surface-soft animate-pulse mb-6"
        />
        <div className="grid grid-cols-2 gap-5 max-bp1000:grid-cols-1 max-bp620:gap-3">
          {cards.map(([id, height]) => (
            <div
              key={id}
              aria-hidden="true"
              className={cx("rounded-lg bg-surface-soft animate-pulse", height)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
