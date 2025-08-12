import { Outlet } from "react-router-dom";
import AppSideBar from "./AppSidebar";

export const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100">
      {/* Contenedor horizontal */}
      <div className="flex flex-1">
        <AppSideBar />
        {/* Contenido principal */}
        <main className="flex-1 p-4 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
