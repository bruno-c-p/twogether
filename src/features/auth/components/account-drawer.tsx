import { lazy, Suspense, useRef } from "react";
import type { Drawer } from "@base-ui/react/drawer";
import { useClerk } from "@clerk/tanstack-react-start";
import { ThemeToggle } from "@/features/theme/components/theme-toggle/theme-toggle";
import type { Member, AccountPlacement } from "@/features/budget";
import { SettingsSection } from "@/features/auth/components/settings-section";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/glaze/ui/sheet";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { MobileTabContent } from "@/components/ui/mobile-tab-content";
import { cn } from "@/lib/glaze/utils";
import { useBrowserSync } from "@/lib/use-browser-sync";

// The settings (name form, members, invites) show only once the drawer
// opens; they download after the page is interactive.
const loadAccountSettings = () =>
  import("@/features/auth/components/account-settings").then(
    ({ AccountSettings }) => ({ default: AccountSettings }),
  );

const AccountSettings = lazy(loadAccountSettings);

export function AccountDrawer({
  placement,
  user,
  members,
}: {
  placement: AccountPlacement;
  user: Member;
  members: Member[];
}) {
  const sheet = useRef<Drawer.Root.Actions>(null);
  const { openUserProfile } = useClerk();
  useBrowserSync(
    ["account-settings"],
    () => void loadAccountSettings().catch(() => undefined),
  );
  const memberLabel = `${members.length} ${members.length === 1 ? "pessoa" : "pessoas"}`;

  // Clerk's modal lives outside the drawer's focus trap, so close first.
  function manage() {
    sheet.current?.close();
    openUserProfile();
  }

  return (
    <Sheet actionsRef={sheet}>
      {placement === "header" ? (
        <SheetTrigger
          aria-label={`Abrir nosso espaço: ${memberLabel}`}
          title={`Nosso espaço: ${memberLabel}`}
          className="flex cursor-pointer items-center ps-2 focus-visible:focus-ring"
        >
          <MemberAvatars members={members} className="size-8" />
        </SheetTrigger>
      ) : (
        <SheetTrigger className="flex min-h-13 min-w-0 cursor-pointer select-none flex-col items-center justify-center gap-1 text-center type-caption focus-visible:focus-ring">
          <MobileTabContent active={false} label="Conta">
            <MemberAvatars members={members} className="size-5" />
          </MobileTabContent>
        </SheetTrigger>
      )}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Sua conta</SheetTitle>
          <SheetDescription>
            Seu nome, o espaço de vocês e a saída da conta.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="gap-5">
          <SettingsSection
            id="account-theme-title"
            title="Aparência"
            description="Claro, escuro ou o mesmo do seu aparelho."
          >
            <ThemeToggle />
          </SettingsSection>
          <Suspense>
            <AccountSettings user={user} members={members} onManage={manage} />
          </Suspense>
        </SheetBody>
      </SheetContent>
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
          className={cn(className, index > 0 && "-ms-2")}
        />
      ))}
    </span>
  );
}
