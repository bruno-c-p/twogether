import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/features/theme";
import type { Member, View } from "@/features/budget/domain/types";
import { AppFooter } from "@/features/budget/components/app-footer/app-footer";
import {
  DesktopNavigation,
  MobileNavigation,
} from "@/features/budget/components/workspace-navigation";
import { Brand } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";

function initial(member: Member) {
  return member.name.trim().charAt(0).toLocaleUpperCase("pt-BR") || "?";
}

function SpaceLink({
  members,
  memberLabel,
}: {
  members: Member[];
  memberLabel: string;
}) {
  return (
    <Link
      to="/conta"
      aria-label={`Abrir nosso espaço: ${memberLabel}`}
      title={`Nosso espaço: ${memberLabel}`}
      className="flex items-center pl-[8px]"
    >
      {members.slice(0, 2).map((member, index) => (
        <span
          key={member.id}
          aria-hidden="true"
          className={cx(
            "w-[32px] h-[32px] rounded-full inline-flex items-center justify-center",
            "text-[12px] font-600 border-2 border-solid border-page",
            index === 0
              ? "bg-green text-on-brand"
              : "bg-category-pleasure text-on-brand -ml-[10px]",
          )}
        >
          {initial(member)}
        </span>
      ))}
    </Link>
  );
}

export function WorkspaceShell({
  view,
  members = [],
  memberLabel,
  hidden,
  onToggleHidden,
  controls,
  onRegister,
  children,
  overlays,
  account,
}: {
  view?: View;
  members?: Member[];
  memberLabel: string;
  hidden?: boolean;
  onToggleHidden?: () => void;
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
          "border-0 border-b border-solid border-border max-bp1000:static",
        )}
      >
        <div
          className={cx(
            "mx-auto max-w-[1450px] flex flex-wrap items-center gap-x-[10px] gap-y-[12px]",
            "px-[32px] py-[14px] max-bp1190:px-[24px] max-bp800:px-[22px] max-bp620:px-[16px]",
          )}
        >
          <Brand
            mark
            aria-label="twogether — início"
            className="max-bp1000:order-1 mr-[8px] text-[22px]"
            markClassName="scale-[.8]"
          />
          <DesktopNavigation view={view} />
          {controls && (
            <div
              className={cx(
                "ml-auto flex flex-wrap items-center gap-[10px]",
                "max-bp1000:order-3 max-bp1000:w-full max-bp1000:ml-0",
              )}
            >
              {controls}
            </div>
          )}
          <div
            className={cx(
              "flex items-center gap-[8px] [&_button_span]:hidden",
              !controls && "ml-auto",
              "max-bp1000:order-4 max-bp1000:w-full max-bp1000:justify-between",
            )}
          >
            <ThemeToggle />
            {onToggleHidden && (
              <Button
                variant="icon"
                className="text-text-muted"
                onClick={onToggleHidden}
                aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
                title={hidden ? "Mostrar valores" : "Ocultar valores"}
              >
                {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-[8px] max-bp1000:order-2 max-bp1000:ml-auto">
            <SpaceLink members={members} memberLabel={memberLabel} />
            {account}
          </div>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <AppFooter className="max-bp1000:pb-[94px]" />
      <MobileNavigation view={view} onRegister={onRegister} />
      {overlays}
    </div>
  );
}
