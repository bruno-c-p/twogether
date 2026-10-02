import type { ReactNode } from "react";
import { AppFooter } from "@/features/budget/components/app-footer/app-footer";
import {
  DesktopNavigation,
  MobileNavigation,
} from "@/features/budget/components/workspace-navigation";
import { NoticeToast } from "@/features/budget/components/notice";
import { TransactionFlows } from "@/features/budget/components/transaction-flows";
import { useWorkspace } from "@/features/budget/hooks/use-workspace";
import { Brand } from "@/components/ui/brand";
import { cx } from "@/lib/cx";

function WorkspaceNotice() {
  const { notice, setNotice, actions } = useWorkspace();

  if (!notice) return null;

  return (
    <NoticeToast
      notice={notice}
      onUndo={() => void actions.undoNotice()}
      onDismiss={() => setNotice(null)}
    />
  );
}

export function WorkspaceShell({
  controls,
  account,
  children,
}: {
  controls: ReactNode;
  account: ReactNode;
  children: ReactNode;
}) {
  const { actions } = useWorkspace();

  return (
    <div className="min-h-[100dvh]">
      <a
        href="#main-content"
        className="absolute z-40 top-[16px] [inset-inline-start:-999px] focus:[inset-inline-start:16px] bg-surface text-text px-[12px] py-[8px] rounded-[8px]"
      >
        Pular para o conteúdo
      </a>
      <header
        className={cx(
          "sticky top-0 z-20 bg-topbar backdrop-blur",
          "[border-width:0_0_1px] border-solid border-border max-bp1000:static",
        )}
      >
        <div
          className={cx(
            "mx-auto max-w-[1450px] flex flex-wrap items-center gap-x-[10px] gap-y-[12px] max-bp620:gap-x-[6px]",
            "px-[32px] py-[14px] max-bp1190:px-[24px] max-bp800:px-[22px] max-bp620:px-[16px]",
          )}
        >
          <Brand
            mark
            aria-label="twogether — início"
            className="max-bp1000:order-1 mr-[8px] max-bp620:mr-0 text-[22px]"
            markClassName="scale-[.8]"
            textClassName="max-bp620:hidden"
          />
          <DesktopNavigation />
          <div
            className={cx(
              "ml-auto flex flex-wrap items-center gap-[10px]",
              "max-bp1000:order-2 max-bp1000:w-auto max-bp1000:flex-1 max-bp1000:flex-nowrap max-bp1000:ml-0",
              "max-bp620:justify-center max-bp620:gap-[6px]",
            )}
          >
            {controls}
          </div>
          <div className="flex items-center gap-[8px] max-bp1000:order-3">
            {account}
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="scroll-mt-[80px]">
        {children}
      </main>
      <div className="max-bp1000:pb-[77px]">
        <AppFooter />
      </div>
      <MobileNavigation onRegister={actions.openRegister} />
      <TransactionFlows />
      <WorkspaceNotice />
    </div>
  );
}
