import { useState } from "react";
import { useClerk } from "@clerk/tanstack-react-start";
import { AccountSettings } from "@/features/auth/components/account-settings";
import { ThemeToggle } from "@/features/theme";
import type { Member } from "@/features/budget/domain/types";
import { Sheet, SheetHeader, SheetTrigger } from "@/components/ui/sheet";
import { Panel, SectionHeading } from "@/components/ui/panel/panel";
import { cx } from "@/lib/cx";

function initial(member: Member) {
  return member.name.trim().charAt(0).toLocaleUpperCase("pt-BR") || "?";
}

export function AccountDrawer({
  user,
  members,
}: {
  user: Member;
  members: Member[];
}) {
  const [open, setOpen] = useState(false);
  const { openUserProfile } = useClerk();
  const memberLabel = `${members.length} ${members.length === 1 ? "pessoa" : "pessoas"}`;

  // Clerk's modal lives outside the drawer's focus trap, so close first.
  function manage() {
    setOpen(false);
    openUserProfile();
  }

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      trigger={
        <SheetTrigger
          aria-label={`Abrir nosso espaço: ${memberLabel}`}
          title={`Nosso espaço: ${memberLabel}`}
          className="flex items-center pl-[8px] border-0 bg-transparent p-0 cursor-pointer"
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
        </SheetTrigger>
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
        <div className="px-[23px] pb-[23px] max-bp620:px-4 max-bp620:pb-4">
          <ThemeToggle />
        </div>
      </Panel>
      <AccountSettings user={user} members={members} onManage={manage} />
    </Sheet>
  );
}
