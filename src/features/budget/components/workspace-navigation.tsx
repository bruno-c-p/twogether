import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { WORKSPACE_NAVIGATION } from "@/features/budget/constants";
import { cx } from "@/lib/cx";

// Links keep month and person through the workspace layout's
// retainSearchParams and mark the current page with aria-current. The
// router's scroll restoration moves to the top of the new page.
const activeOptions = { exact: true, includeSearch: false };

export function DesktopNavigation() {
  return (
    <nav
      aria-label="Navegação principal"
      className="flex items-center gap-[4px] max-bp1000:hidden"
    >
      {WORKSPACE_NAVIGATION.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={activeOptions}
          className={cx(
            "px-[13px] py-[8px] rounded-[9px] text-[13px]",
            "hover:bg-surface-soft",
          )}
          activeProps={{ className: "bg-surface-soft text-text" }}
          inactiveProps={{ className: "text-text-muted" }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function MobileLink({ item }: { item: (typeof WORKSPACE_NAVIGATION)[number] }) {
  return (
    <Link
      to={item.to}
      activeOptions={activeOptions}
      className={cx(
        "flex flex-col items-center gap-[4px] flex-1 min-w-0 py-[2px] text-[10.5px]",
      )}
      activeProps={{ className: "text-green" }}
      inactiveProps={{ className: "text-text-muted" }}
    >
      {({ isActive }) => (
        <>
          <item.icon
            aria-hidden="true"
            size={20}
            strokeWidth={isActive ? 2.2 : 1.8}
          />
          <span className="truncate max-w-full">{item.label}</span>
        </>
      )}
    </Link>
  );
}

export function MobileNavigation({ onRegister }: { onRegister: () => void }) {
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
      <MobileLink item={first} />
      <MobileLink item={second} />
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
      <MobileLink item={third} />
      <MobileLink item={fourth} />
    </nav>
  );
}
