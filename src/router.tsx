import { createBrowserRouter, Navigate } from "react-router-dom";
import { Settings, HelpCircle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import RequireAuth from "@/components/RequireAuth";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import RolesPage from "@/pages/RolesPage";
import UsersPage from "@/pages/UsersPage";
import ServicesPage from "@/pages/ServicesPage";
import VehiclesPage from "@/pages/VehiclesPage";
import DistributionPage from "@/pages/DistributionPage";
import AssignStaffPage from "@/pages/AssignStaffPage";
import ServiceStatusPage from "@/pages/ServiceStatusPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import TourismDetailPage from "@/pages/TourismDetailPage";
import TrainingDetailPage from "@/pages/TrainingDetailPage";
import DaycareDetailPage from "@/pages/DaycareDetailPage";
import FAQPage from "@/pages/FAQPage";
import CategoriesPage from "@/pages/CategoriesPage";
import ProductsPage from "@/pages/ProductsPage";
import DiscountCouponsPage from "@/pages/DiscountCouponsPage";
import SalesPage from "@/pages/SalesPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
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
      { path: "dashboard", element: <DashboardPage /> },
      { path: "roles", element: <RolesPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "services", element: <ServicesPage /> },
      { path: "distribution", element: <DistributionPage /> },
      { path: "acompanamiento", element: <ServiceStatusPage /> },
      { path: "assign-staff", element: <AssignStaffPage /> },
      { path: "vehicles", element: <VehiclesPage /> },
      { path: "tourism-details", element: <TourismDetailPage /> },
      { path: "training-details", element: <TrainingDetailPage /> },
      { path: "daycare-details", element: <DaycareDetailPage /> },
      { path: "faqs", element: <FAQPage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "discount-coupons", element: <DiscountCouponsPage /> },
      { path: "sales", element: <SalesPage /> },
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
