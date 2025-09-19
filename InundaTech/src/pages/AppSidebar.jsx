import { NavLink, useNavigate } from "react-router-dom";
import { Home, LogOut, TrendingUpDown} from "lucide-react";
import { FaHouseFloodWaterCircleArrowRight } from "react-icons/fa6";
import { LuMessageSquarePlus } from "react-icons/lu";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Mensajeria", url: "/alertas", icon: LuMessageSquarePlus },
  { title: "Predicciones", url: "/history", icon: TrendingUpDown },
  { title: "Análisis Historico", url: "/huracanes", icon: LogOut },
];

export default function AppSidebar() {
  // const location = useLocation();
  const navigate = useNavigate();
  // const currentPath = location.pathname;

  const navClasses = (active) =>
    `flex items-center px-4 py-2 rounded-md transition-colors ${
      active
        ? "bg-blue-600 text-white font-semibold shadow-md"
        : "text-gray-700 hover:bg-blue-100 hover:text-blue-700"
    }`;

  const handleLogout = () => {
    navigate("/"); 
  };

  return (
    <aside className="flex flex-col w-64 h-screen bg-white shadow-md">
      <div className="flex items-center space-x-3 px-6 py-5 border-b border-gray-200">
        <div className="p-2 bg-blue-600 rounded-lg">
          <FaHouseFloodWaterCircleArrowRight className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">InundaTech</h2>
          <p className="text-xs text-gray-500">Sistema de Monitoreo</p>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        <p className="px-4 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Navegación
        </p>
        {menuItems.map(({ title, url, icon: Icon }) => (
          <NavLink key={title} to={url} className={({ isActive }) => navClasses(isActive)}>
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="ml-3">{title}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-3 border-t border-gray-200">
        <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-md p-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-700 font-medium">Sistema Activo</span>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md px-4 py-2 transition"
          aria-label="Cerrar sesión"
          type="button"
        >
          <LogOut className="h-5 w-5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
