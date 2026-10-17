import type { ReactNode } from "react";
import { AppFooter } from "@/features/budget/components/app-footer/app-footer";
import {
  DesktopNavigation,
  MobileNavigation,
} from "@/features/budget/components/workspace-navigation";
import { TransactionFlows } from "@/features/budget/components/transaction-flows";
import { useWorkspace } from "@/features/budget/hooks/use-workspace";
import { Brand } from "@/components/ui/brand";
import { cx } from "@/lib/cx";

/** The account entry renders as header avatars on desktop and a tab on phones. */
export type AccountPlacement = "header" | "tab";

export function WorkspaceShell({
  controls,
  account,
  children,
}: {
  controls: ReactNode;
  account: (placement: AccountPlacement) => ReactNode;
  children: ReactNode;
}) {
  const { actions } = useWorkspace();

  return (
    <div className="min-h-[100dvh] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      <a
        href="#main-content"
        className="absolute z-40 top-[16px] [inset-inline-start:-999px] focus:[inset-inline-start:16px] bg-surface text-text px-3 py-2 rounded-md"
      >
        Pular para o conteúdo
      </a>
      <header
        className={cx(
          "sticky top-0 z-20 bg-topbar backdrop-blur pt-[env(safe-area-inset-top,0px)]",
          "[border-width:0_0_1px] border-solid border-border max-bp1000:static",
        )}
      >
        <div
          className={cx(
            "mx-auto max-w-[1450px] flex flex-wrap items-center gap-x-2 gap-y-3 max-bp620:gap-x-1.5",
            "px-8 py-4 max-bp1190:px-6 max-bp800:px-6 max-bp620:px-4",
          )}
        >
          <Brand
            mark
            aria-label="twogether — início"
            className="max-bp1000:order-1 mr-2 max-bp620:mr-0 text-xl"
            markClassName="scale-[.8]"
            textClassName="max-bp620:hidden"
          />
          <DesktopNavigation />
          <div
            className={cx(
              "ml-auto flex flex-wrap items-center gap-2",
              "max-bp1000:order-2 max-bp1000:w-auto max-bp1000:flex-1 max-bp1000:flex-nowrap max-bp1000:ml-0",
              "max-bp620:justify-center max-bp620:gap-1.5",
            )}
          >
            {controls}
          </div>
          <div className="flex items-center gap-2 max-bp1000:hidden">
            {account("header")}
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="scroll-mt-[80px]">
        {children}
      </main>
      <div className="max-bp1000:pb-mobile-nav">
        <AppFooter />
      </div>
      <MobileNavigation
        account={account("tab")}
        onRegister={() => actions.openTransaction(null)}
      />
      <TransactionFlows />
    </div>
  );
}
