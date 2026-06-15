import { Navigate } from "react-router-dom";
import { getStoredToken } from "@/store/authStore";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!getStoredToken()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
