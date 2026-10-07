import { Button } from "@/components/ui/button";
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
      className="flex items-center gap-1 max-bp1000:hidden"
    >
      {WORKSPACE_NAVIGATION.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={activeOptions}
          className={cx(
            "px-3 py-2 rounded-md text-sm",
            "@hover:bg-surface-soft active:bg-surface-soft",
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
        "select-none [-webkit-touch-callout:none] flex flex-col items-center gap-1 shrink-0 min-h-[48px] min-w-[44px] justify-center rounded-md active:bg-surface-soft py-0.5 text-center text-xs leading-[1.2]",
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
          <span className="whitespace-normal">{item.label}</span>
        </>
      )}
    </Link>
  );
}

export function MobileNavigation({ onRegister }: { onRegister: () => void }) {
  const [first, second, third] = WORKSPACE_NAVIGATION;

  return (
    <nav
      aria-label="Navegação mobile"
      className={cx(
        "hidden max-bp1000:grid grid-cols-[1fr_auto_1fr] fixed bottom-0 inset-x-0 z-30 items-center",
        "bg-mobile-nav backdrop-blur [border-width:1px_0_0] border-solid border-border",
        "pl-[max(8px,env(safe-area-inset-left,0px))] pr-[max(8px,env(safe-area-inset-right,0px))] pt-2 pb-[max(20px,env(safe-area-inset-bottom,0px))]",
      )}
    >
      <div className="flex justify-around">
        <MobileLink item={first} />
        <MobileLink item={second} />
      </div>
      <div className="shrink-0 flex justify-center">
        <Button
          variant="unstyled"
          type="button"
          aria-label="Registrar transação"
          onClick={onRegister}
          className={cx(
            "w-[48px] h-[48px] rounded-full border-0 cursor-pointer",
            "bg-green text-on-brand inline-flex items-center justify-center",
            "shadow-[0_6px_14px_-6px_rgba(13,13,18,.55)]",
          )}
        >
          <Plus size={22} />
        </Button>
      </div>
      <div className="flex justify-around">
        <MobileLink item={third} />
      </div>
    </nav>
  );
}
