import { Navigate } from "react-router-dom";
import { getStoredUser } from "@/store/authStore";
import { firstAllowedRoute } from "@/lib/permissions";

/** Entra a la primera pantalla que el rol permite (se evalúa al renderizar). */
export default function HomeRedirect() {
  return (
    <Navigate
      to={firstAllowedRoute(getStoredUser()) ?? "/dashboard"}
      replace
    />
  );
}
