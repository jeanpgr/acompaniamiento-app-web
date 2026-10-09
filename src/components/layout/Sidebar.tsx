import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Shield,
  Users,
  Briefcase,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Truck,
  Heart,
  LogOut,
  MessageCircleQuestion,
  Tag,
  Package,
  Ticket,
  ShoppingCart,
  Settings,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clearAuth } from "@/store/authStore";
import { getMyProfile } from "@/api/users";
import type { AuthUser } from "@/api/auth";

type NavItem = { to: string; icon: LucideIcon; label: string };

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Módulos",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/roles", icon: Shield, label: "Roles y permisos" },
      { to: "/users", icon: Users, label: "Usuarios y roles" },
      { to: "/services", icon: Briefcase, label: "Gestión servicios" },
      { to: "/distribution", icon: CalendarDays, label: "Distribución" },
      { to: "/acompanamiento", icon: Eye, label: "Acompañamiento" },
      { to: "/vehicles", icon: Truck, label: "Vehículos" },
      { to: "/faqs", icon: MessageCircleQuestion, label: "FAQ" },
    ],
  },
  {
    title: "Comercio",
    items: [
      { to: "/categories", icon: Tag, label: "Categorías" },
      { to: "/products", icon: Package, label: "Productos" },
      { to: "/discount-coupons", icon: Ticket, label: "Cupones" },
      { to: "/sales", icon: ShoppingCart, label: "Ventas" },
    ],
  },
  {
    title: "Sistema",
    items: [{ to: "/settings", icon: Settings, label: "Configuración" }],
  },
];

interface Props {
  user: AuthUser | null;
  /** Solo aplica bajo `lg`: el panel se muestra como cajón lateral. */
  open: boolean;
  onClose: () => void;
  /** Solo aplica desde `lg`: el panel queda en una columna de íconos. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/** Foto de perfil del usuario con sesión, o sus iniciales si no tiene. */
function ProfileAvatar({
  src,
  initials,
  name,
}: {
  src: string | null | undefined;
  initials: string;
  name: string;
}) {
  // URL firmada que no cargó (vencida o borrada): se muestran las iniciales.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (src && src !== failedSrc) {
    return (
      <img
        src={src}
        alt=""
        title={name}
        onError={() => setFailedSrc(src)}
        className="w-10 h-10 rounded-full object-cover shrink-0 bg-sage ring-2 ring-white/15"
      />
    );
  }
  return (
    <div
      title={name}
      className="w-10 h-10 rounded-full bg-sage flex items-center justify-center text-white text-sm font-bold shrink-0"
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

export default function Sidebar({
  user,
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  // La sesión guarda solo la clave de la foto; /users/me trae la URL firmada.
  // Bajo ["users"]: se refresca al editar usuarios desde el panel.
  const profile = useQuery({
    queryKey: ["users", "me"],
    queryFn: getMyProfile,
    staleTime: 5 * 60_000,
    enabled: !!user,
  });

  const handleLogout = () => {
    clearAuth();
    // Los datos en caché eran de esta sesión: el siguiente usuario no debe verlos.
    queryClient.clear();
    navigate("/login");
  };

  const initials = user
    ? `${user.name[0] ?? ""}${user.lastname?.[0] ?? ""}`.toUpperCase()
    : "??";
  const fullName = user ? `${user.name} ${user.lastname}` : "Usuario";

  // Las variantes contraídas llevan `lg:`: el cajón móvil siempre va completo.
  const hideWhenCollapsed = collapsed ? "lg:hidden" : "";

  return (
    <>
      {/* Velo del cajón en pantallas angostas */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`lg:hidden fixed inset-0 z-40 bg-sidebar/50 transition-opacity duration-200 ease-out-quart ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        id="panel-navegacion"
        aria-label="Navegación principal"
        className={`fixed top-0 left-0 z-50 h-full w-64 flex flex-col bg-sidebar transition-[transform,width] duration-200 ease-out-quart lg:translate-x-0 ${
          collapsed ? "lg:w-20" : ""
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Marca */}
        <div
          className={`flex items-center gap-3 px-5 h-20 border-b border-white/10 shrink-0 ${
            collapsed ? "lg:justify-center lg:px-0" : ""
          }`}
        >
          <div
            className="w-11 h-11 shrink-0 rounded-full bg-gold flex items-center justify-center shadow-[0_6px_16px_-4px_rgb(252_201_118/0.45)]"
            title={collapsed ? "Acompáñame · Panel Admin" : undefined}
            aria-hidden="true"
          >
            <Heart size={22} className="text-sidebar" fill="currentColor" />
          </div>
          <div className={`flex-1 min-w-0 ${hideWhenCollapsed}`}>
            <p className="text-white text-base font-extrabold leading-tight">
              Acompáñame
            </p>
            <p className="text-gold text-xs font-semibold">Panel Admin</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="lg:hidden w-10 h-10 inline-flex items-center justify-center rounded-full text-on-dark hover:text-white hover:bg-sidebar-hover"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contraer / expandir (solo escritorio): sobre el borde del panel */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls="panel-navegacion"
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          title={collapsed ? "Expandir menú" : "Contraer menú"}
          className="hidden lg:inline-flex absolute -right-4 top-6 z-10 w-8 h-8 items-center justify-center rounded-full bg-surface text-primary shadow-md ring-1 ring-line hover:bg-primary-soft transition-colors"
        >
          {collapsed ? (
            <ChevronsRight size={18} aria-hidden="true" />
          ) : (
            <ChevronsLeft size={18} aria-hidden="true" />
          )}
        </button>

        <nav
          className={`flex-1 overflow-y-auto overflow-x-hidden py-5 px-3 [scrollbar-color:var(--color-sidebar-hover)_transparent] ${
            collapsed ? "lg:px-2" : ""
          }`}
        >
          {NAV_SECTIONS.map((section, i) => (
            <div key={section.title} className={i > 0 ? "mt-5" : undefined}>
              {/* Contraído: el título queda para el lector de pantalla y una
                  línea separa visualmente las secciones. */}
              <p
                className={`text-gold/90 text-xs font-bold px-3 mb-2 ${
                  collapsed ? "lg:sr-only" : ""
                }`}
              >
                {section.title}
              </p>
              {collapsed && i > 0 && (
                <div
                  aria-hidden="true"
                  className="hidden lg:block mx-3 mb-3 h-px bg-white/10"
                />
              )}
              <ul>
                {section.items.map(({ to, icon: Icon, label }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      viewTransition
                      title={collapsed ? label : undefined}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 px-3 h-11 rounded-lg text-[15px] mb-1 transition-colors duration-150 relative focus-visible:outline-white ${
                          collapsed ? "lg:justify-center lg:px-0" : ""
                        } ${
                          isActive
                            ? "bg-sidebar-active text-white font-semibold shadow-raised"
                            : "text-on-dark font-medium hover:text-white hover:bg-sidebar-hover"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gold"
                            />
                          )}
                          <Icon size={20} aria-hidden="true" className="shrink-0" />
                          <span
                            className={`truncate ${collapsed ? "lg:sr-only" : ""}`}
                          >
                            {label}
                          </span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Usuario */}
        <div
          className={`border-t border-white/10 p-4 flex items-center gap-3 shrink-0 ${
            collapsed ? "lg:justify-center lg:px-0" : ""
          }`}
        >
          <ProfileAvatar
            src={profile.data?.image}
            initials={initials}
            name={fullName}
          />
          <div className={`flex-1 min-w-0 ${hideWhenCollapsed}`}>
            <p className="text-white text-sm font-semibold truncate">
              {fullName}
            </p>
            <p className="text-on-dark text-xs truncate">
              {user?.role ?? "Admin"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className={`w-10 h-10 inline-flex items-center justify-center rounded-full text-on-dark hover:text-white hover:bg-sidebar-hover transition-colors focus-visible:outline-white ${hideWhenCollapsed}`}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
}
