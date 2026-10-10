import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronsUpDown, KeyRound, LogOut, UserRound } from "lucide-react";

interface Props {
  /** Foto + nombre + rol que se muestran en el botón. */
  children: ReactNode;
  /** Nombre completo (para el lector de pantalla y la cabecera del menú). */
  fullName: string;
  email?: string | null;
  /** Menú lateral contraído (desde lg): el menú se abre hacia el costado. */
  collapsed: boolean;
  onProfile: () => void;
  onPassword: () => void;
  onLogout: () => void;
}

type Item = {
  key: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
};

/**
 * Botón del usuario al pie del menú lateral que despliega sus opciones:
 * Perfil, Cambiar contraseña y Cerrar sesión. Patrón de menú accesible:
 * flechas para moverse, Escape o clic fuera para cerrar y el foco vuelve
 * al botón.
 */
export default function UserMenu({
  children,
  fullName,
  email,
  collapsed,
  onProfile,
  onPassword,
  onLogout,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const items: Item[] = [
    { key: "profile", label: "Perfil", icon: UserRound, onSelect: onProfile },
    {
      key: "password",
      label: "Cambiar contraseña",
      icon: KeyRound,
      onSelect: onPassword,
    },
    {
      key: "logout",
      label: "Cerrar sesión",
      icon: LogOut,
      onSelect: onLogout,
      danger: true,
    },
  ];

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  // Al abrir, el foco va a la primera opción; un clic fuera lo cierra.
  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const onMenuKeyDown = (e: KeyboardEvent) => {
    const list = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (n: number) =>
      list[(n + list.length) % list.length]?.focus();
    if (e.key === "ArrowDown") focusAt(i + 1);
    else if (e.key === "ArrowUp") focusAt(i - 1);
    else if (e.key === "Home") focusAt(0);
    else if (e.key === "End") focusAt(list.length - 1);
    else if (e.key === "Escape") close();
    else if (e.key === "Tab") close(false);
    else return;
    if (e.key !== "Tab") e.preventDefault();
  };

  return (
    <div
      ref={wrapRef}
      className={`relative flex-1 min-w-0 ${collapsed ? "lg:flex-none" : ""}`}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Opciones de ${fullName}`}
        title={collapsed ? fullName : undefined}
        className={`group w-full flex items-center gap-3 p-1.5 rounded-xl text-left transition-colors focus-visible:outline-white ${
          open ? "bg-sidebar-hover" : "hover:bg-sidebar-hover"
        }`}
      >
        {children}
        <ChevronsUpDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-on-dark group-hover:text-white ${collapsed ? "lg:hidden" : ""}`}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={`Opciones de ${fullName}`}
          onKeyDown={onMenuKeyDown}
          className={`user-menu absolute z-50 bottom-full left-0 right-0 mb-2 rounded-xl bg-surface p-1.5 shadow-lg ring-1 ring-line ${
            collapsed
              ? "lg:left-full lg:right-auto lg:bottom-0 lg:mb-0 lg:ml-4 lg:w-64"
              : ""
          }`}
        >
          {/* Cabecera: de quién es el menú (útil con el panel contraído) */}
          <div className="px-3 pt-2 pb-2.5 mb-1 border-b border-line">
            <p className="text-sm font-bold text-ink truncate">{fullName}</p>
            {email && <p className="text-xs text-ink-3 truncate">{email}</p>}
          </div>
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={item.key}>
                {item.danger && (
                  <div className="my-1 h-px bg-line" aria-hidden="true" />
                )}
                <button
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => {
                    close(false);
                    item.onSelect();
                  }}
                  className={`w-full flex items-center gap-3 h-11 px-3 rounded-lg text-[15px] font-medium text-left transition-colors outline-none ${
                    item.danger
                      ? "text-danger-fg hover:bg-danger-bg focus-visible:bg-danger-bg"
                      : "text-ink hover:bg-primary-soft focus-visible:bg-primary-soft"
                  }`}
                >
                  <Icon
                    size={19}
                    aria-hidden="true"
                    className={item.danger ? "" : "text-primary"}
                  />
                  {item.label}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
