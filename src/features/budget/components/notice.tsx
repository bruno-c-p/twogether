import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import type { Transaction } from "@/features/budget/domain/types";

export type Notice = {
  message: string;
  undo?: Transaction;
  undoSettle?: Transaction;
};

export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  useEffect(() => {
    if (!notice || notice.undo || notice.undoSettle) return;

    const timer = window.setTimeout(() => setNotice(null), 8000);

    return () => window.clearTimeout(timer);
  }, [notice]);

  return { notice, setNotice };
}

export function NoticeToast({
  notice,
  onUndo,
  onDismiss,
}: {
  notice: Notice;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className={[
        "fixed bottom-[25px] left-[calc(50%_+_113px)] -translate-x-1/2 z-100",
        "bg-toast text-on-toast border border-solid border-accent rounded-md",
        "px-4 py-4 flex items-center gap-3 text-sm",
        "w-max max-w-[calc(100%_-_40px)]",
        "animate-[toast-in_0.2s_ease]",
        "max-bp1190:left-[calc(50%_+_100px)]",
        "max-bp1000:left-[calc(50%_+_38px)]",
        "max-bp620:bottom-[85px] max-bp620:left-1/2 max-bp620:text-xs",
        "max-bp620:p-3 max-bp620:gap-2",
        "max-bp620:max-w-[calc(100%_-_24px)]",
      ].join(" ")}
    >
      <Check size={18} className="text-on-toast-soft" />
      <span className="max-bp620:max-w-[210px] max-bp620:leading-[1.5]">
        {notice.message}
      </span>
      {(notice.undo || notice.undoSettle) && (
        <button
          className="bg-transparent border-0 underline underline-offset-[3px] p-1 text-on-toast-soft"
          onClick={onUndo}
        >
          Desfazer
        </button>
      )}
      <button
        className="bg-transparent border-0 text-on-toast-soft no-underline flex p-1"
        aria-label="Fechar aviso"
        onClick={onDismiss}
      >
        <X size={16} />
      </button>
    </div>
  );
}
