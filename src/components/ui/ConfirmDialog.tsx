import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Modal from "./Modal";
import Button from "./Button";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** "danger" pinta la acción en rojo (eliminar, desactivar). */
  tone?: "danger" | "primary";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Sustituye a window.confirm con un diálogo del sistema del panel.
// Uso: const confirm = useConfirm(); if (await confirm({ title })) ...
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  };

  const tone = options?.tone ?? "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={options !== null}
        onClose={() => settle(false)}
        title={options?.title ?? ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => settle(false)}>
              Cancelar
            </Button>
            <Button variant={tone} onClick={() => settle(true)} autoFocus>
              {options?.confirmLabel ?? "Eliminar"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2 leading-relaxed">
          {options?.message ?? "Esta acción no se puede deshacer."}
        </p>
      </Modal>
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx)
    throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
  return ctx;
}
