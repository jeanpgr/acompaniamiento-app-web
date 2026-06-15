import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { getStoredUser } from "@/store/authStore";

export default function Layout() {
  const user = getStoredUser();

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#EEF1F8" }}>
      <Sidebar user={user} />
      <main className="ml-52 flex-1 p-7 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
