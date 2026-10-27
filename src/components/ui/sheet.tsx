import {
  lazy,
  Suspense,
  use,
  useId,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useHydrated } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SheetPartsContext,
  SheetTriggerContext,
  type SheetActions,
} from "@/components/ui/sheet-context";
import type { SheetDrawer as Drawer } from "@/components/ui/sheet-drawer";
import { toastManager } from "@/components/ui/toast-manager";
import { reportError } from "@/lib/errors";
import { useBrowserSync } from "@/lib/use-browser-sync";

export type { SheetActions };

// A drawer chunk that never arrived (a dropped connection, or a deploy that
// replaced it) leaves the plain trigger instead of the route's error screen.
// Online, a tap reloads the page for fresh chunks; offline, a reload would
// lose the page, so the tap says so instead. navigator.onLine only knows
// about a hard offline; on a link that is up but failing, the reload runs.
const RELOAD = {
  onOpen: () => {
    if (navigator.onLine) window.location.reload();
    else toastManager.add({ title: "Sem conexão. Tente novamente." });
  },
};

function DrawerUnavailable({
  trigger,
  defaultOpen,
}: ComponentProps<typeof Drawer>) {
  // A tap that landed while the chunk was failing acts now.
  useBrowserSync(["sheet-unavailable-tap"], RELOAD.onOpen, defaultOpen);

  return <SheetTriggerContext value={RELOAD}>{trigger}</SheetTriggerContext>;
}

// The drawer (Base UI's Drawer, its focus trap and swipe handling) shows only
// after a tap, so it loads once the page hydrates instead of before. A tap
// on the plain trigger that stands in until then is remembered and opens the
// sheet when the drawer arrives.
const SheetDrawer = lazy(() =>
  import("@/components/ui/sheet-drawer").then(
    ({ SheetDrawer }) => ({ default: SheetDrawer }),
    (error) => {
      reportError(error, { context: "Sheet drawer download" });

      return { default: DrawerUnavailable };
    },
  ),
);

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
  const queryClient = useQueryClient();
  const tapped = ["sheet-tapped", useId()];

  const pending = useQuery({
    queryKey: tapped,
    queryFn: () => false,
    enabled: false,
  }).data;

  const plain = (
    <SheetTriggerContext
      value={{ onOpen: () => queryClient.setQueryData(tapped, true) }}
    >
      {trigger}
    </SheetTriggerContext>
  );

  if (!useHydrated()) return plain;

  return (
    <Suspense fallback={plain}>
      <SheetDrawer
        // A tap that lands while the drawer mounts remounts it open, once.
        key={pending ? "tapped" : "idle"}
        actions={actions}
        trigger={trigger}
        narrow={narrow}
        defaultOpen={pending === true}
      >
        {children}
      </SheetDrawer>
    </Suspense>
  );
}

export function SheetHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const parts = use(SheetPartsContext);

  if (!parts) return null;
  const { Title, Description, Close } = parts;

  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <Title className="m-0 text-2xl font-800 tracking-[-0.035em]">
          {title}
        </Title>
        {description && (
          <Description className="text-text-muted mt-1 mb-0">
            {description}
          </Description>
        )}
      </div>
      <Close render={<Button variant="icon" aria-label="Fechar" />}>
        <X size={18} />
      </Close>
    </div>
  );
}

// The drawer can swap this button out between a press and its release, and
// then no click follows. The same pointer released over the button's spot
// still counts as the tap; a cancelled press (a scroll), another finger or a
// release elsewhere does not.
function completeIfSwapped(
  press: ReactPointerEvent<HTMLButtonElement>,
  onOpen: () => void,
) {
  const button = press.currentTarget;
  const area = button.getBoundingClientRect();

  const settle = (event: PointerEvent) => {
    if (event.pointerId !== press.pointerId) return;

    document.removeEventListener("pointerup", settle);
    document.removeEventListener("pointercancel", settle);

    const over =
      event.clientX >= area.left &&
      event.clientX <= area.right &&
      event.clientY >= area.top &&
      event.clientY <= area.bottom;

    if (event.type === "pointerup" && over && !button.isConnected) onOpen();
  };

  document.addEventListener("pointerup", settle);
  document.addEventListener("pointercancel", settle);
}

export function SheetTrigger(props: ComponentProps<"button">) {
  const sheet = use(SheetTriggerContext);

  if ("Trigger" in sheet) return <sheet.Trigger {...props} />;

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={false}
      {...props}
      onPointerDown={(event) => {
        if (event.button === 0) completeIfSwapped(event, sheet.onOpen);
      }}
      onClick={sheet.onOpen}
    />
  );
}
