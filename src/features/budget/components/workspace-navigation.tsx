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
        "flex flex-col items-center gap-[4px] flex-1 min-w-0 py-[2px] text-[10.5px]",
        active ? "text-green font-600" : "text-text-muted",
      )}
    >
      <item.icon aria-hidden="true" size={20} strokeWidth={active ? 2.2 : 1.8} />
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
        "hidden max-bp1000:flex fixed bottom-0 inset-x-0 z-30 items-center",
        "bg-mobile-nav backdrop-blur [border-width:1px_0_0] border-solid border-border",
        "px-[8px] pt-[8px] pb-[max(20px,env(safe-area-inset-bottom))]",
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
            "w-[48px] h-[48px] rounded-full border-0 cursor-pointer",
            "bg-green text-on-brand inline-flex items-center justify-center",
            "shadow-[0_6px_14px_-6px_rgba(23,63,53,.55)]",
          )}
        >
          <Plus size={22} />
        </button>
      </div>
      <MobileLink item={third} view={view} />
      <MobileLink item={fourth} view={view} />
    </nav>
  );
}
