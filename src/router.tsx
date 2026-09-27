import { createBrowserRouter, Navigate } from "react-router-dom";
import type { ComponentType } from "react";
import { Settings, HelpCircle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import RequireAuth from "@/components/RequireAuth";
import PlaceholderPage from "@/pages/PlaceholderPage";

// Cada página se descarga bajo demanda (un chunk por ruta) en lugar de
// empaquetar todo el panel en un único bundle: el navegador solo baja el
// código de las secciones que realmente se visitan. Con `lazy` el router
// espera al chunk antes de navegar, así que no hace falta <Suspense>.
const page =
  (load: () => Promise<{ default: ComponentType }>) => async () => ({
    Component: (await load()).default,
  });

export const router = createBrowserRouter([
  {
    path: "/login",
    lazy: page(() => import("@/pages/LoginPage")),
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", lazy: page(() => import("@/pages/DashboardPage")) },
      { path: "roles", lazy: page(() => import("@/pages/RolesPage")) },
      { path: "users", lazy: page(() => import("@/pages/UsersPage")) },
      { path: "services", lazy: page(() => import("@/pages/ServicesPage")) },
      { path: "distribution", lazy: page(() => import("@/pages/DistributionPage")) },
      { path: "acompanamiento", lazy: page(() => import("@/pages/ServiceStatusPage")) },
      { path: "assign-staff", lazy: page(() => import("@/pages/AssignStaffPage")) },
      { path: "vehicles", lazy: page(() => import("@/pages/VehiclesPage")) },
      { path: "tourism-details", lazy: page(() => import("@/pages/TourismDetailPage")) },
      { path: "training-details", lazy: page(() => import("@/pages/TrainingDetailPage")) },
      { path: "daycare-details", lazy: page(() => import("@/pages/DaycareDetailPage")) },
      { path: "faqs", lazy: page(() => import("@/pages/FAQPage")) },
      { path: "categories", lazy: page(() => import("@/pages/CategoriesPage")) },
      { path: "products", lazy: page(() => import("@/pages/ProductsPage")) },
      { path: "discount-coupons", lazy: page(() => import("@/pages/DiscountCouponsPage")) },
      { path: "sales", lazy: page(() => import("@/pages/SalesPage")) },
      {
        path: "settings",
        element: (
          <PlaceholderPage
            icon={Settings}
            title="Ajustes"
            subtitle="Configuración general de la plataforma"
          />
        ),
      },
      {
        path: "help",
        element: (
          <PlaceholderPage
            icon={HelpCircle}
            title="Ayuda"
            subtitle="Centro de ayuda y preguntas frecuentes"
          />
        ),
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
