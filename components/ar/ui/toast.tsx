"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

export type ToastTone = "success" | "error" | "info" | "warning";

export type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
};

type ToastContextValue = {
  notify: (toast: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<
  ToastTone,
  { icon: typeof CheckCircle2; ring: string; iconClass: string }
> = {
  success: {
    icon: CheckCircle2,
    ring: "ring-emerald-200",
    iconClass: "text-emerald-600",
  },
  error: { icon: XCircle, ring: "ring-rose-200", iconClass: "text-rose-600" },
  warning: {
    icon: AlertTriangle,
    ring: "ring-amber-200",
    iconClass: "text-amber-600",
  },
  info: { icon: Info, ring: "ring-sky-200", iconClass: "text-sky-600" },
};

let nextId = 1;

export function ArToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = nextId++;
      setToasts((list) => [...list.slice(-3), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (title, description) => notify({ tone: "success", title, description }),
      error: (title, description) => notify({ tone: "error", title, description }),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(22rem,calc(100vw-2.5rem))] flex-col gap-2">
              {toasts.map((toast) => {
                const style = TONE_STYLES[toast.tone];
                const Icon = style.icon;
                return (
                  <div
                    key={toast.id}
                    role="status"
                    className={`pointer-events-auto flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-[0_8px_30px_rgba(15,23,42,0.12)] ring-1 ${style.ring}`}
                    style={{
                      animation: "arToastIn 220ms cubic-bezier(0.22,1,0.36,1) both",
                    }}
                  >
                    <Icon
                      className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconClass}`}
                      style={{ animation: "arPop 320ms ease-out both" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {toast.title}
                      </p>
                      {toast.description ? (
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                          {toast.description}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => dismiss(toast.id)}
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Dismiss notification"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useArToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useArToast must be used inside <ArToastProvider>");
  }
  return ctx;
}
