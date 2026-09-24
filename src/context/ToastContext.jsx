import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);
let seq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const toast = useCallback((msg, opts = {}) => {
    const id = ++seq;
    setToasts((t) => [...t, { id, msg, actionLabel: opts.actionLabel, onAction: opts.onAction }]);
    timers.current[id] = setTimeout(() => dismiss(id), opts.duration || 5000);
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <span style={{ flex: '1 1 auto' }}>{t.msg}</span>
            {t.onAction && (
              <button
                onClick={() => {
                  t.onAction();
                  dismiss(t.id);
                }}
              >
                {t.actionLabel || 'Desfazer'}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return ctx.toast;
}
