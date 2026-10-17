import type { ReactNode, RefObject } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import { usePhone } from "@/lib/use-phone";

export type SheetActions = Drawer.Root.Actions;

/**
 * Side panel on wide screens, bottom sheet on phones. The trigger opens it;
 * `actions.current.close()` closes it from inside, e.g. after a pick.
 */
export function Sheet({
  actions,
  trigger,
  narrow = false,
  children,
}: {
  actions?: RefObject<SheetActions | null>;
  trigger: ReactNode;
  narrow?: boolean;
  children: ReactNode;
}) {
  const phone = usePhone();

  return (
    <Drawer.Root actionsRef={actions} swipeDirection={phone ? "down" : "right"}>
      {trigger}
      <Drawer.Portal>
        <Drawer.Backdrop
          className={cx(
            "fixed inset-0 z-40 bg-dialog-backdrop backdrop-blur-[5px]",
            "[opacity:calc(1-var(--drawer-swipe-progress))]",
            "transition-opacity duration-300",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            "data-[swiping]:duration-0",
          )}
        />
        <Drawer.Viewport
          className={cx(
            "fixed inset-0 z-50 flex justify-end",
            "max-bp620:items-end",
          )}
        >
          <Drawer.Popup
            className={cx(
              "flex flex-col bg-page text-text outline-0 overflow-y-auto overscroll-contain",
              "border-0 border-solid border-transparent",
              narrow ? "w-[360px]" : "w-[440px]",
              "h-full max-w-full border-l",
              "max-bp620:h-auto max-bp620:w-full max-bp620:max-h-[88dvh]",
              "max-bp620:border-l-0 max-bp620:border-t max-bp620:rounded-t-lg",
              "motion-safe:transition-transform duration-300 ease-[var(--ease-drawer)]",
              "data-[swipe-direction=right]:[transform:translateX(var(--drawer-swipe-movement-x))]",
              "data-[swipe-direction=down]:[transform:translateY(var(--drawer-swipe-movement-y))]",
              "data-[swiping]:duration-0",
              "data-[swipe-direction=right]:data-[starting-style]:translate-x-full",
              "data-[swipe-direction=right]:data-[ending-style]:translate-x-full",
              "data-[swipe-direction=down]:data-[starting-style]:translate-y-full",
              "data-[swipe-direction=down]:data-[ending-style]:translate-y-full",
            )}
          >
            <div
              aria-hidden="true"
              className="hidden max-bp620:block shrink-0 mx-auto mt-2 h-[5px] w-[44px] rounded-full bg-text-muted/40"
            />
            <Drawer.Content
              className={cx(
                "px-6 pt-[calc(24px+env(safe-area-inset-top,0px))] pb-[calc(24px+env(safe-area-inset-bottom,0px))]",
                "max-bp620:pt-4 max-bp620:pl-[max(16px,env(safe-area-inset-left,0px))] max-bp620:pr-[max(16px,env(safe-area-inset-right,0px))]",
                "max-bp620:pb-[calc(16px+env(safe-area-inset-bottom,0px))]",
              )}
            >
              {children}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export function SheetHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <Drawer.Title className="m-0 text-2xl font-800 tracking-[-0.035em]">
          {title}
        </Drawer.Title>
        {description && (
          <Drawer.Description className="text-text-muted mt-1 mb-0">
            {description}
          </Drawer.Description>
        )}
      </div>
      <Drawer.Close render={<Button variant="icon" aria-label="Fechar" />}>
        <X size={18} />
      </Drawer.Close>
    </div>
  );
}

export const SheetTrigger = Drawer.Trigger;
