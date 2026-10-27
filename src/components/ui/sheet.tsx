import {
  lazy,
  Suspense,
  use,
  useId,
  type ComponentProps,
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

export type { SheetActions };

// The drawer (Base UI's Drawer, its focus trap and swipe handling) shows only
// after a tap, so it loads once the page hydrates instead of before. A tap
// on the plain trigger that stands in until then is remembered and opens the
// sheet when the drawer arrives.
const SheetDrawer = lazy(() =>
  import("@/components/ui/sheet-drawer").then(({ SheetDrawer }) => ({
    default: SheetDrawer,
  })),
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

export function SheetTrigger(props: ComponentProps<"button">) {
  const sheet = use(SheetTriggerContext);

  if ("Trigger" in sheet) return <sheet.Trigger {...props} />;

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={false}
      {...props}
      // Pointer down too: the drawer can swap this button out mid-tap.
      onPointerDown={sheet.onOpen}
      onClick={sheet.onOpen}
    />
  );
}
