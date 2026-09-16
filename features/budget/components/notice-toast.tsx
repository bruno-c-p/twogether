import { Check, X } from "lucide-react";

interface Props {
  message: string;
  canUndo: boolean;
  onUndo: () => void;
  onClose: () => void;
}

export function NoticeToast({ message, canUndo, onUndo, onClose }: Props) {
  return (
    <div className="toast" role="status">
      <Check size={18} />
      <span>{message}</span>
      {canUndo && <button onClick={onUndo}>Desfazer</button>}
      <button className="toast-close" aria-label="Fechar aviso" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}
