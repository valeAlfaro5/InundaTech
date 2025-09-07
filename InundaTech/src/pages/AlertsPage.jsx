import { useState, useEffect } from "react";
import { Clock, Users } from "lucide-react";

const AlertsPage = () => {
  const [alertHistory, setAlertHistory] = useState([]);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("http://localhost:3000/alerts");
      const data = await res.json();
      setAlertHistory(data);
      data.map(alert => console.log( alert.severity));
    } catch (err) {
      console.error("❌ Error cargando historial:", err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const getSeverityColor = severity => {
    switch (severity) {
      case "Bajo":
        return "text-green-600 bg-green-50 border-green-200";
      case "Moderado":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "Alto":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "Crítico":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getSeverityText = severity => {
    switch (severity) {
      case "Bajo":
        return "Baja";
      case "Moderado":
        return "Media";
      case "Alto":
        return "Alta";
      case "Crítico":
        return "Crítica";
      default:
        return severity;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="border rounded-2xl bg-white shadow-sm p-4 hover:shadow-md transition">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-2">
          <Clock className="w-5 h-5" /> Historial de Alertas
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Últimas notificaciones enviadas a la comunidad
        </p>

        <div className="space-y-4 max-h-155 overflow-y-auto">
          {alertHistory.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay alertas registradas</p>
          ) : (
            alertHistory.map(alert => (
              <div
                key={alert.id}
                className="p-4 rounded-lg bg-cyan-50 border border-gray-200 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}
                  >
                    {getSeverityText(alert.severity)}
                    
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{alert.message}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {alert.recipients || "N/A"} usuarios
                  </div>
                  <span>{new Date(alert.timestamp).toLocaleString("es-ES")}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;
