import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Add,
  ChartLine,
  Columns,
  Icon,
  TableView,
} from "@/components/glaze/icon";
import { Button } from "@/components/glaze/ui/button";
import {
  WORKSPACE_NAVIGATION,
  WORKSPACE_PATHS,
} from "@/features/budget/constants";
import { MobileTabContent } from "@/components/app/mobile-tab-content";
import { mobileTabClass } from "@/components/app/mobile-tab";
import { cn, controlHeight } from "@/lib/glaze/utils";

// Links keep month and person through the workspace layout's
// retainSearchParams and mark the current page with aria-current. The
// router's scroll restoration moves to the top of the new page.
const activeOptions = { exact: true, includeSearch: false };

const tabIcons = {
  [WORKSPACE_PATHS.overview]: Columns,
  [WORKSPACE_PATHS.transactions]: TableView,
  [WORKSPACE_PATHS.goals]: ChartLine,
};

export function DesktopNavigation() {
  return (
    <nav
      aria-label="Navegação principal"
      className="flex items-center gap-1 max-lg:hidden"
    >
      {WORKSPACE_NAVIGATION.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={activeOptions}
          className={cn(
            controlHeight.default,
            "inline-flex items-center rounded-pill px-3 type-label",
            "transition-colors duration-(--dur-press) ease-out motion-reduce:transition-none",
          )}
          activeProps={{ className: "bg-pressed text-text-1" }}
          inactiveProps={{
            className: "text-text-2 hover:bg-hover hover:text-text-1",
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function MobileLink({ item }: { item: (typeof WORKSPACE_NAVIGATION)[number] }) {
  return (
    <Link to={item.to} activeOptions={activeOptions} className={mobileTabClass}>
      {({ isActive }) => (
        <MobileTabContent
          active={isActive}
          label={"mobileLabel" in item ? item.mobileLabel : item.label}
        >
          <Icon icon={tabIcons[item.to]} size={20} />
        </MobileTabContent>
      )}
    </Link>
  );
}

export function MobileNavigation({
  account,
  onRegister,
}: {
  account: ReactNode;
  onRegister: () => void;
}) {
  const [first, second, third] = WORKSPACE_NAVIGATION;

  return (
    <nav
      aria-label="Navegação mobile"
      className={cn(
        "fixed inset-x-0 bottom-0 z-(--z-sticky) hidden h-(--mobile-nav-height) grid-cols-[1fr_1fr_auto_1fr_1fr] items-center max-lg:grid",
        "border-t border-line-faint bg-paper",
        "ps-[max(var(--space-2),env(safe-area-inset-left))] pe-[max(var(--space-2),env(safe-area-inset-right))] pt-2 pb-[max(var(--space-5),env(safe-area-inset-bottom))]",
      )}
    >
      <MobileLink item={first} />
      <MobileLink item={second} />
      <Button
        size="icon-lg"
        aria-label="Registrar transação"
        onClick={onRegister}
        className="mx-2"
      >
        <Icon icon={Add} size={20} />
      </Button>
      <MobileLink item={third} />
      {account}
    </nav>
  );
}
