import { NavLink, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Shield,
  Users,
  Briefcase,
  CalendarDays,
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
import { useQueryClient } from "@tanstack/react-query";
import { clearAuth } from "@/store/authStore";
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
}

export default function Sidebar({ user, open, onClose }: Props) {
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const handleLogout = () => {
    clearAuth();
    // Los datos en caché eran de esta sesión: el siguiente usuario no debe verlos.
    queryClient.clear();
    navigate("/login");
  };

  const initials = user
    ? `${user.name[0] ?? ""}${user.lastname?.[0] ?? ""}`.toUpperCase()
    : "??";

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
        className={`fixed top-0 left-0 z-50 h-full w-56 flex flex-col bg-sidebar transition-transform duration-200 ease-out-quart lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Marca */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 shrink-0">
          <div
            className="w-9 h-9 rounded-lg bg-brand-mark flex items-center justify-center"
            aria-hidden="true"
          >
            <Heart size={18} className="text-white" fill="white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-tight">
              Acompáñame
            </p>
            <p className="text-white/65 text-xs">Panel Admin</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="lg:hidden w-9 h-9 inline-flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-sidebar-hover"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 [scrollbar-color:var(--color-sidebar-active)_transparent]">
          {NAV_SECTIONS.map((section, i) => (
            <div key={section.title} className={i > 0 ? "mt-5" : undefined}>
              <p className="text-white/55 text-[11px] font-semibold px-3 mb-1.5 uppercase tracking-wider">
                {section.title}
              </p>
              <ul>
                {section.items.map(({ to, icon: Icon, label }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      viewTransition
                      className={({ isActive }) =>
                        `group flex items-center gap-3 px-3 h-9 rounded-md text-sm mb-0.5 transition-colors duration-150 relative focus-visible:outline-white ${
                          isActive
                            ? "bg-sidebar-active text-white font-medium"
                            : "text-white/75 hover:text-white hover:bg-sidebar-hover"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-accent"
                            />
                          )}
                          <Icon size={16} aria-hidden="true" />
                          <span>{label}</span>
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
        <div className="border-t border-white/10 p-3 flex items-center gap-3 shrink-0">
          <div
            className="w-8 h-8 rounded-full bg-brand-mark flex items-center justify-center text-white text-xs font-bold shrink-0"
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {user ? `${user.name} ${user.lastname}` : "Usuario"}
            </p>
            <p className="text-white/65 text-xs truncate">
              {user?.role ?? "Admin"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-sidebar-hover transition-colors focus-visible:outline-white"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
