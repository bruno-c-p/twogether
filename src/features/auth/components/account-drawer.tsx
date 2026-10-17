import { useRef } from "react";
import { useClerk } from "@clerk/tanstack-react-start";
import { AccountSettings } from "@/features/auth/components/account-settings";
import { ThemeToggle } from "@/features/theme";
import type { Member } from "@/features/budget/domain/types";
import {
  Sheet,
  SheetHeader,
  SheetTrigger,
  type SheetActions,
} from "@/components/ui/sheet";
import { Panel, SectionHeading } from "@/components/ui/panel/panel";
import { PersonAvatar } from "@/components/ui/person-avatar";
import type { AccountPlacement } from "@/features/budget/components/workspace-shell";
import { MobileTabContent } from "@/features/budget/components/workspace-navigation";
import { cx } from "@/lib/cx";

export function AccountDrawer({
  placement,
  user,
  members,
}: {
  placement: AccountPlacement;
  user: Member;
  members: Member[];
}) {
  const sheet = useRef<SheetActions>(null);
  const { openUserProfile } = useClerk();
  const memberLabel = `${members.length} ${members.length === 1 ? "pessoa" : "pessoas"}`;

  // Clerk's modal lives outside the drawer's focus trap, so close first.
  function manage() {
    sheet.current?.close();
    openUserProfile();
  }

  return (
    <Sheet
      actions={sheet}
      trigger={
        placement === "header" ? (
          <SheetTrigger
            aria-label={`Abrir nosso espaço: ${memberLabel}`}
            title={`Nosso espaço: ${memberLabel}`}
            className="flex items-center py-0 pr-0 pl-2 border-0 bg-transparent cursor-pointer"
          >
            <MemberAvatars
              members={members}
              className="w-[32px] h-[32px] text-xs border-2 border-page"
            />
          </SheetTrigger>
        ) : (
          <SheetTrigger className="mobile-tab">
            <MobileTabContent active={false} label="Conta">
              <MemberAvatars
                members={members}
                className="w-[22px] h-[22px] text-xs border-2 border-mobile-nav"
              />
            </MobileTabContent>
          </SheetTrigger>
        )
      }
    >
      <SheetHeader
        title="Sua conta"
        description="Seu nome, o espaço de vocês e a saída da conta."
      />
      <Panel aria-labelledby="account-theme-title">
        <SectionHeading
          title="Aparência"
          titleId="account-theme-title"
          description="Claro, escuro ou o mesmo do seu aparelho."
        />
        <div className="px-6 pb-6 max-bp620:px-4 max-bp620:pb-4">
          <ThemeToggle />
        </div>
      </Panel>
      <AccountSettings user={user} members={members} onManage={manage} />
    </Sheet>
  );
}

function MemberAvatars({
  members,
  className,
}: {
  members: Member[];
  className: string;
}) {
  return (
    <span className="flex items-center">
      {members.slice(0, 2).map((member, index) => (
        <PersonAvatar
          key={member.id}
          aria-hidden="true"
          name={member.name}
          position={index}
          className={cx("border-solid", className, index > 0 && "-ml-2")}
        />
      ))}
    </span>
  );
}
