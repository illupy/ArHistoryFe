import { useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import './Toast.css';

let toastIdCounter = 0;
let addToastFn = null;

export function showToast(message, type = 'success', duration = 3000) {
  if (addToastFn) {
    addToastFn({ id: ++toastIdCounter, message, type, duration });
  }
}

const TOAST_ICONS = {
  success: <CheckCircle2 size={16} />,
  error: <XCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info: <Info size={16} />,
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  addToastFn = useCallback((toast) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, toast.duration);
  }, []);

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type} animate-slide-left`}>
          <span className="toast-icon">
            {TOAST_ICONS[toast.type]}
          </span>
          <span className="toast-message">{toast.message}</span>
          <button
            className="toast-dismiss"
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
