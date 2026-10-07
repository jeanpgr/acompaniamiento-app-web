import { createBrowserRouter, Navigate } from "react-router-dom";
import type { ComponentType } from "react";
import Layout from "@/components/layout/Layout";
import { guestOnlyLoader, requireAuthLoader } from "@/store/authStore";

// Cada página se descarga bajo demanda (un chunk por ruta) en lugar de
// empaquetar todo el panel en un único bundle: el navegador solo baja el
// código de las secciones que realmente se visitan. Con `lazy` el router
// espera al chunk antes de navegar, así que no hace falta <Suspense>.
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
});

export const router = createBrowserRouter([
  {
    path: "/login",
    loader: guestOnlyLoader,
    lazy: page(() => import("@/pages/LoginPage")),
  },
  {
    path: "/",
    // Sin sesión redirige a /login antes de pintar el panel.
    loader: requireAuthLoader,
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", lazy: page(() => import("@/pages/DashboardPage")) },
      { path: "roles", lazy: page(() => import("@/pages/RolesPage")) },
      { path: "users", lazy: page(() => import("@/pages/UsersPage")) },
      { path: "services", lazy: page(() => import("@/pages/ServicesPage")) },
      {
        path: "distribution",
        children: [
          { index: true, lazy: page(() => import("@/pages/DistributionPage")) },
          // Página hija: todas las citas con su estado, sin el calendario.
          {
            path: "servicios",
            lazy: page(() => import("@/pages/DistributionServicesPage")),
          },
        ],
      },
      {
        path: "acompanamiento",
        lazy: page(() => import("@/pages/ServiceStatusPage")),
      },
      {
        path: "assign-staff",
        lazy: page(() => import("@/pages/AssignStaffPage")),
      },
      { path: "vehicles", lazy: page(() => import("@/pages/VehiclesPage")) },
      {
        path: "tourism-details",
        children: [
          {
            index: true,
            lazy: page(() => import("@/pages/TourismDetailPage")),
          },
          // Página hija: reservas de una excursión para confirmar pagos.
          {
            path: ":tripId/reservas",
            lazy: page(() => import("@/pages/TourismReservationsPage")),
          },
        ],
      },
      {
        path: "training-details",
        children: [
          {
            index: true,
            lazy: page(() => import("@/pages/TrainingDetailPage")),
          },
          // Página hija: inscripciones de un taller para confirmar pagos.
          {
            path: ":trainingId/inscripciones",
            lazy: page(() => import("@/pages/TrainingEnrollmentsPage")),
          },
        ],
      },
      {
        path: "daycare-details",
        lazy: page(() => import("@/pages/DaycareDetailPage")),
      },
      { path: "faqs", lazy: page(() => import("@/pages/FAQPage")) },
      {
        path: "categories",
        lazy: page(() => import("@/pages/CategoriesPage")),
      },
      { path: "products", lazy: page(() => import("@/pages/ProductsPage")) },
      {
        path: "discount-coupons",
        lazy: page(() => import("@/pages/DiscountCouponsPage")),
      },
      { path: "sales", lazy: page(() => import("@/pages/SalesPage")) },
      { path: "settings", lazy: page(() => import("@/pages/SettingsPage")) },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
