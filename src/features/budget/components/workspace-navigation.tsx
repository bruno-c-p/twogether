import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import type { View } from "@/features/budget/domain/types";
import { WORKSPACE_NAVIGATION } from "@/features/budget/constants";
import { withView } from "@/features/budget/search";
import { cx } from "@/lib/cx";

function scrollTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function DesktopNavigation({ view }: { view?: View }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="flex items-center gap-[4px] max-bp1000:hidden"
    >
      {WORKSPACE_NAVIGATION.map((item) => (
        <Link
          key={item.id}
          to="/"
          search={(prev) => withView(prev, item.id)}
          aria-current={view === item.id ? "page" : undefined}
          onClick={scrollTop}
          className={cx(
            "px-[13px] py-[8px] rounded-[9px] text-[13px] text-text-muted",
            "hover:bg-surface-soft",
            view === item.id && "bg-surface-soft text-text font-600",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function MobileLink({
  item,
  view,
}: {
  item: (typeof WORKSPACE_NAVIGATION)[number];
  view?: View;
}) {
  const active = view === item.id;

  return (
    <Link
      to="/"
      search={(prev) => withView(prev, item.id)}
      aria-current={active ? "page" : undefined}
      onClick={scrollTop}
      className={cx(
        "flex flex-col items-center gap-[3px] flex-1 min-w-0 text-[10px]",
        active ? "text-text font-600" : "text-text-muted",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "w-[6px] h-[6px] rounded-full",
          active ? "bg-green" : "border border-solid border-text-muted",
        )}
      />
      <span className="truncate max-w-full">{item.label}</span>
    </Link>
  );
}

export function MobileNavigation({
  view,
  onRegister,
}: {
  view?: View;
  onRegister?: () => void;
}) {
  const [first, second, third, fourth] = WORKSPACE_NAVIGATION;

  return (
    <nav
      aria-label="Navegação mobile"
      className={cx(
        "hidden max-bp1000:flex fixed bottom-0 inset-x-0 z-30 items-end",
        "bg-mobile-nav backdrop-blur border-t border-solid border-border",
        "px-[8px] pt-[10px] pb-[max(10px,env(safe-area-inset-bottom))]",
      )}
    >
      <MobileLink item={first} view={view} />
      <MobileLink item={second} view={view} />
      <div className="flex-1 flex justify-center">
        <button
          type="button"
          aria-label="Registrar transação"
          onClick={onRegister}
          className={cx(
            "-mt-[34px] w-[56px] h-[56px] rounded-[18px] border-0",
            "bg-green text-on-brand inline-flex items-center justify-center",
            "shadow-[0_10px_20px_-8px_rgba(23,63,53,.55)]",
          )}
        >
          <Plus size={24} />
        </button>
      </div>
      <MobileLink item={third} view={view} />
      <MobileLink item={fourth} view={view} />
    </nav>
  );
}
