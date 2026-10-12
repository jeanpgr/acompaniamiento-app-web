import { useState } from "react";
import { Outlet, useLoaderData, useLocation } from "react-router-dom";
import { Heart, Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import type { requireAuthLoader } from "@/store/authStore";

// Preferencia de este navegador: menú lateral contraído en escritorio.
const COLLAPSED_KEY = "sidebar_collapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export default function Layout() {
  const { user } = useLoaderData<typeof requireAuthLoader>();
  const { pathname } = useLocation();
  // En pantallas angostas la navegación es un cajón lateral. Se guarda la ruta
  // en la que se abrió: al navegar a otra, queda cerrado sin efectos extra.
  const [navOpenAt, setNavOpenAt] = useState<string | null>(null);
  const navOpen = navOpenAt === pathname;
  const setNavOpen = (open: boolean) => setNavOpenAt(open ? pathname : null);

  // En escritorio el menú se puede contraer a solo íconos.
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // Sin almacenamiento disponible la preferencia dura solo esta visita.
    }
  };

  return (
    <div className="flex min-h-screen bg-app-bg">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:bg-surface focus:text-ink focus:font-semibold focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
      >
        Saltar al contenido
      </a>

      <Sidebar
        user={user}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />

      <div
        className={`flex-1 min-w-0 transition-[margin] duration-200 ease-out-quart motion-reduce:transition-none ${
          collapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        {/* Barra superior solo en pantallas angostas */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-16 px-4 bg-sidebar text-white shadow-md">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={navOpen}
            aria-controls="panel-navegacion"
            className="-ml-2 w-11 h-11 inline-flex items-center justify-center rounded-full hover:bg-sidebar-hover"
          >
            <Menu size={22} />
          </button>
          <span
            className="w-9 h-9 rounded-full bg-gold flex items-center justify-center"
            aria-hidden="true"
          >
            <Heart size={18} className="text-sidebar" fill="currentColor" />
          </span>
          <span className="text-base font-extrabold">Acompáñame</span>
        </header>

        <main
          id="contenido"
          tabIndex={-1}
          className="p-4 sm:p-6 lg:p-8 outline-none"
        >
          <div className="mx-auto max-w-350">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
