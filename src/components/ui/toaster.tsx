import { Toast } from "@base-ui/react/toast";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast-manager";

function ToastViewport() {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Portal>
      <Toast.Viewport
        aria-label="Avisos"
        className="fixed bottom-[calc(24px_+_var(--navigation-clearance))] left-1/2 -translate-x-1/2 z-100 flex flex-col gap-3 w-[356px] max-w-[calc(100%_-_32px)] outline-0 [--navigation-clearance:env(safe-area-inset-bottom)] max-bp1000:[--navigation-clearance:var(--mobile-nav-height)]"
      >
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            toast={toast}
            data-slot="toast"
            className="flex items-center gap-3 rounded-md bg-surface text-text border border-solid border-border p-4 text-sm shadow-lg transition-opacity motion-safe:transition-[opacity,transform] duration-200 ease-[var(--ease-out)] data-[starting-style]:opacity-0 motion-safe:data-[starting-style]:translate-y-2 data-[ending-style]:opacity-0 motion-safe:data-[ending-style]:translate-y-2 data-[limited]:hidden"
          >
            <Check size={18} className="shrink-0 text-text-muted" />
            <Toast.Title className="flex-1 min-w-0 break-words text-sm font-500 tracking-normal m-0">
              {toast.title}
            </Toast.Title>
            <Toast.Action
              render={<Button variant="unstyled" />}
              className="bg-transparent border-0 underline underline-offset-[3px] p-1 text-text-muted shrink-0"
            />
            <Toast.Close
              render={<Button variant="unstyled" />}
              aria-label="Fechar aviso"
              aria-hidden={false}
              className="bg-transparent border-0 flex p-1 text-text-muted shrink-0"
            >
              <X size={16} />
            </Toast.Close>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

export function Toaster() {
  return (
    <Toast.Provider toastManager={toastManager} timeout={8000}>
      <ToastViewport />
    </Toast.Provider>
  );
}
