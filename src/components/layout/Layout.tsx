import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Heart, Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import { getStoredUser } from "@/store/authStore";

export default function Layout() {
  const user = getStoredUser();
  const { pathname } = useLocation();
  // En pantallas angostas la navegación es un cajón lateral. Se guarda la ruta
  // en la que se abrió: al navegar a otra, queda cerrado sin efectos extra.
  const [navOpenAt, setNavOpenAt] = useState<string | null>(null);
  const navOpen = navOpenAt === pathname;
  const setNavOpen = (open: boolean) => setNavOpenAt(open ? pathname : null);

  return (
    <div className="flex min-h-screen bg-app-bg">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:bg-surface focus:text-ink focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
      >
        Saltar al contenido
      </a>

      <Sidebar user={user} open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex-1 min-w-0 lg:ml-56">
        {/* Barra superior solo en pantallas angostas */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-sidebar text-white">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={navOpen}
            aria-controls="panel-navegacion"
            className="-ml-2 w-10 h-10 inline-flex items-center justify-center rounded-lg hover:bg-sidebar-hover"
          >
            <Menu size={20} />
          </button>
          <span
            className="w-7 h-7 rounded-lg bg-brand-mark flex items-center justify-center"
            aria-hidden="true"
          >
            <Heart size={14} fill="white" />
          </span>
          <span className="text-sm font-semibold">Acompáñame</span>
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
