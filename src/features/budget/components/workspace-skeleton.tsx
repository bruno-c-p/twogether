import { Brand } from "@/components/ui/brand";
import { cx } from "@/lib/cx";

const cards = [
  ["balance", "h-[180px]"],
  ["debt", "h-[180px]"],
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
        <div className="mx-auto max-w-[1450px] h-full flex items-center px-[32px] max-bp1190:px-[24px] max-bp800:px-[22px] max-bp620:px-[16px]">
          <Brand mark className="text-[22px]" markClassName="scale-[.8]" />
        </div>
      </header>
      <div className="max-w-[1450px] mx-auto px-[43px] pt-[39px] max-bp1190:px-[28px] max-bp1190:pt-[30px] max-bp800:px-[22px] max-bp800:pt-[27px] max-bp620:px-[19px] max-bp620:pt-[26px]">
        <div
          aria-hidden="true"
          className="h-[28px] w-[180px] rounded-[8px] bg-surface-soft animate-pulse mb-[22px]"
        />
        <div className="grid grid-cols-2 gap-[20px] max-bp1000:grid-cols-1 max-bp620:gap-[12px]">
          {cards.map(([id, height]) => (
            <div
              key={id}
              aria-hidden="true"
              className={cx(
                "rounded-[16px] bg-surface-soft animate-pulse",
                height,
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
