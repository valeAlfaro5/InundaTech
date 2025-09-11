import AppSidebar from "./AppSidebar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="flex">
      <div className="fixed inset-y-0 left-0 w-64">
        <AppSidebar />
      </div>

      <main className="ml-64 flex-1 h-screen overflow-y-auto bg-gradient-to-br from-blue-50 via-cyan-100 to-blue-100">
        <Outlet />
      </main>
    </div>
  );
}
