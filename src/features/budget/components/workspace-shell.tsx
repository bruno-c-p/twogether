import type { ReactNode } from "react";
import type { View } from "@/features/budget/domain/types";
import { AppFooter } from "@/features/budget/components/app-footer/app-footer";
import {
  DesktopNavigation,
  MobileNavigation,
} from "@/features/budget/components/workspace-navigation";
import { Brand } from "@/components/ui/brand";
import { cx } from "@/lib/cx";

export function WorkspaceShell({
  view,
  controls,
  onRegister,
  children,
  overlays,
  account,
}: {
  view?: View;
  controls?: ReactNode;
  onRegister?: () => void;
  children: ReactNode;
  overlays?: ReactNode;
  account?: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh]">
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
          <DesktopNavigation view={view} />
          {controls && (
            <div
              className={cx(
                "ml-auto flex flex-wrap items-center gap-[10px]",
                "max-bp1000:order-2 max-bp1000:w-auto max-bp1000:flex-1 max-bp1000:flex-nowrap max-bp1000:ml-0",
                "max-bp620:justify-center max-bp620:gap-[6px]",
              )}
            >
              {controls}
            </div>
          )}
          <div
            className={cx(
              "flex items-center gap-[8px] max-bp1000:order-3",
              !controls && "ml-auto",
            )}
          >
            {account}
          </div>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <div className="max-bp1000:pb-[77px]">
        <AppFooter />
      </div>
      <MobileNavigation view={view} onRegister={onRegister} />
      {overlays}
    </div>
  );
}
