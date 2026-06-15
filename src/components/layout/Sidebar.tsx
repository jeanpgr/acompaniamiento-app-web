import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Shield,
  Users,
  Briefcase,
  CalendarDays,
  Eye,
  UserCheck,
  Truck,
  Settings,
  HelpCircle,
  Heart,
  LogOut,
  Compass,
  GraduationCap,
  Baby,
  MessageCircleQuestion,
  Tag,
  Package,
  Ticket,
  ShoppingCart,
} from "lucide-react";
import { clearAuth } from "@/store/authStore";
import type { AuthUser } from "@/api/auth";

const NAV_MODULES = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/roles", icon: Shield, label: "Roles y permisos" },
  { to: "/users", icon: Users, label: "Usuarios y roles" },
  { to: "/services", icon: Briefcase, label: "Gestión servicios" },
  { to: "/distribution", icon: CalendarDays, label: "Distribución" },
  { to: "/acompanamiento", icon: Eye, label: "Acompañamiento" },
  { to: "/assign-staff", icon: UserCheck, label: "Asignar personal" },
  { to: "/vehicles", icon: Truck, label: "Vehículos" },
  { to: "/tourism-details", icon: Compass, label: "Detalles turismo" },
  { to: "/training-details", icon: GraduationCap, label: "Capacitaciones" },
  { to: "/daycare-details", icon: Baby, label: "Guardería" },
  { to: "/faqs", icon: MessageCircleQuestion, label: "FAQ" },
];

const NAV_COMMERCE = [
  { to: "/categories", icon: Tag, label: "Categorías" },
  { to: "/products", icon: Package, label: "Productos" },
  { to: "/discount-coupons", icon: Ticket, label: "Cupones" },
  { to: "/sales", icon: ShoppingCart, label: "Ventas" },
];

const NAV_CONFIG = [
  { to: "/settings", icon: Settings, label: "Ajustes" },
  { to: "/help", icon: HelpCircle, label: "Ayuda" },
];

interface Props {
  user: AuthUser | null;
}

export default function Sidebar({ user }: Props) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const initials = user
    ? `${user.name[0] ?? ""}${user.lastname?.[0] ?? ""}`.toUpperCase()
    : "??";

  return (
    <aside
      className="fixed top-0 left-0 h-full w-52 flex flex-col"
      style={{ backgroundColor: "#17263A" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "#2A5298" }}
        >
          <Heart size={18} className="text-white" fill="white" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold leading-tight">
            Acompáñame
          </p>
          <p className="text-white/50 text-xs">Panel Admin</p>
        </div>
      </div>

      {/* Modules nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <p className="text-white/30 text-xs font-medium px-2 mb-2 tracking-wider">
          MÓDULOS
        </p>
        {NAV_MODULES.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-0.5 transition-colors relative ${
                isActive
                  ? "text-white font-medium"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                    style={{ backgroundColor: "#F07340" }}
                  />
                )}
                <Icon
                  size={16}
                  className={isActive ? "text-white" : "text-white/60"}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <p className="text-white/30 text-xs font-medium px-2 mt-4 mb-2 tracking-wider">
          COMERCIO
        </p>
        {NAV_COMMERCE.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-0.5 transition-colors relative ${
                isActive
                  ? "text-white font-medium"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                    style={{ backgroundColor: "#F07340" }}
                  />
                )}
                <Icon
                  size={16}
                  className={isActive ? "text-white" : "text-white/60"}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <p className="text-white/30 text-xs font-medium px-2 mt-4 mb-2 tracking-wider">
          CONFIGURACIÓN
        </p>
        {NAV_CONFIG.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-0.5 transition-colors ${
                isActive
                  ? "text-white font-medium"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-3 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: "#2A5298" }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-medium truncate">
            {user ? `${user.name} ${user.lastname}` : "Usuario"}
          </p>
          <p className="text-white/40 text-xs truncate">
            {user?.role ?? "Admin"}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-white/40 hover:text-white/80 transition-colors"
          title="Cerrar sesión"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
