import { cx } from "@/lib/cx";

const bars = [
  "h-[12px] w-[76px] -mb-[8px] rounded-[6px]",
  "h-[46px] rounded-[10px]",
  "h-[43px] rounded-[7px]",
  "h-[12px] w-[132px] self-center mt-[2px] rounded-[6px]",
];

export function SignInSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-[18px]">
      <span className="sr-only">Carregando o formulário de acesso…</span>
      {bars.map((bar) => (
        <span
          key={bar}
          aria-hidden="true"
          className={cx("block bg-surface-soft animate-pulse", bar)}
        />
      ))}
    </div>
  );
}
