import { cx } from "@/lib/cx";

const bars = [
  "h-[12px] w-[76px] -mb-2 rounded-sm",
  "h-[46px] rounded-md",
  "h-[43px] rounded-sm",
  "h-[12px] w-[132px] self-center mt-0.5 rounded-sm",
];

export function SignInSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
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
