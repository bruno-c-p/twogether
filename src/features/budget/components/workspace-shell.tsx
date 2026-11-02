import type { ReactNode } from "react";
import { AppFooter } from "@/components/app/app-footer/app-footer";
import {
  DesktopNavigation,
  MobileNavigation,
} from "@/features/budget/components/workspace-navigation";
import { TransactionFlows } from "@/features/budget/components/transaction-flows";
import { useWorkspace } from "@/features/budget/hooks/use-workspace";
import { Brand } from "@/components/app/brand";
import { cn } from "@/lib/glaze/utils";

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
    <div className="min-h-dvh bg-page ps-[env(safe-area-inset-left)] pe-[env(safe-area-inset-right)] text-text-1">
      <a
        href="#main-content"
        className="sr-only rounded-pill bg-paper px-3 py-2 type-label focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-(--z-overlay)"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-(--z-sticky) border-b border-line-faint bg-page pt-[env(safe-area-inset-top)] max-lg:static">
        <div className="mx-auto flex w-full max-w-360 flex-wrap items-center gap-x-2 gap-y-3 px-4 py-3 max-sm:gap-x-1.5 sm:px-6 xl:px-10">
          <Brand
            mark
            aria-label="twogether, início"
            className="me-2 max-lg:order-1 max-sm:me-0"
            textClassName="max-sm:hidden"
          />
          <DesktopNavigation />
          <div
            className={cn(
              "ms-auto flex flex-wrap items-center gap-2",
              "max-lg:order-2 max-lg:ms-0 max-lg:flex-1 max-lg:flex-nowrap",
              "max-sm:justify-center max-sm:gap-1.5",
            )}
          >
            {controls}
          </div>
          <div className="flex items-center gap-2 max-lg:hidden">
            {account("header")}
          </div>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-360 scroll-mt-20 px-4 pt-6 sm:px-6 lg:pt-8 xl:px-10"
      >
        {children}
      </main>
      <div className="max-lg:pb-(--mobile-nav-height)">
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
