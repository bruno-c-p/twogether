import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import styles from "@/features/budget/components/budget-app.module.css";
import type { Transaction } from "@/features/budget/types";

export type Notice = {
  message: string;
  undo?: Transaction;
};

export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  useEffect(() => {
    if (!notice) return;
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
    <div className={styles.toast} role="status">
      <Check size={18} />
      <span>{notice.message}</span>
      {notice.undo && (
        <button onClick={onUndo}>Desfazer</button>
      )}
      <button
        className={styles.toastClose}
        aria-label="Fechar aviso"
        onClick={onDismiss}
      >
        <X size={16} />
      </button>
    </div>
  );
}
