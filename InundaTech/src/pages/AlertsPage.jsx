import React, { useState, useEffect } from "react";
import {
  Send,
  Clock,
  Users,
  Bell,
  MessageSquare,
  Mail
} from "lucide-react";
import { useToast } from "../hooks/use-toast";

const AlertsPage = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [method, setMethod] = useState("email");
  const [isLoading, setIsLoading] = useState(false);
  const [alertHistory, setAlertHistory] = useState([]); // 👈 viene del backend
  const { toast } = useToast();

  // 🔹 Cargar historial desde el backend
  const fetchAlerts = async () => {
    try {
      const res = await fetch("http://localhost:3000/alerts");
      const data = await res.json();
      setAlertHistory(data);
    } catch (err) {
      console.error("❌ Error cargando historial:", err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleSendAlert = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa el título y mensaje de la alerta",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const fullMessage = `${message}\n\nNivel de severidad: **${getSeverityText(severity)}**`;

      const response = await fetch("http://localhost:3000/sendAlert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message: fullMessage, method, severity })
      });

      if (!response.ok) throw new Error("Error enviando alerta");

      toast({
        title: "Alerta enviada",
        description: `Notificación enviada por ${method.toLowerCase()}`
      });

      setTitle("");
      setMessage("");
      setSeverity("medium");
      setMethod("email");

      // 🔹 Refrescar historial
      fetchAlerts();
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = severity => {
    switch (severity) {
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "high":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "critical":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getSeverityText = severity => {
    switch (severity) {
      case "low":
        return "Baja";
      case "medium":
        return "Media";
      case "high":
        return "Alta";
      case "critical":
        return "Crítica";
      default:
        return severity;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Centro de Alertas</h1>
          <p className="text-gray-600">
            Envía notificaciones por correo o SMS a la comunidad sobre el estado de inundaciones
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 📌 Formulario Nueva Alerta */}
        <div className="border rounded-2xl bg-white shadow-sm p-4 hover:shadow-md transition">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-2">
            <Send className="w-5 h-5" /> Nueva Alerta
          </h2>
          <div className="space-y-4">
            {/* Título */}
            <div>
              <label className="block text-sm font-medium mb-1">Título</label>
              <input
                type="text"
                placeholder="Ej: Nivel crítico en Río Magdalena"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>

            {/* Severidad */}
            <div>
              <label className="block text-sm font-medium mb-1">Nivel de Severidad</label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>

            {/* Mensaje */}
            <div>
              <label className="block text-sm font-medium mb-1">Mensaje</label>
              <textarea
                rows={4}
                placeholder="Escribe aquí el mensaje detallado de la alerta..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>

            {/* Método de envío */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Método de Envío</label>
              <div className="flex items-center space-x-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="sms"
                    checked={method === "sms"}
                    onChange={e => setMethod(e.target.value)}
                  />
                  <MessageSquare className="w-4 h-4" />
                  SMS
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="email"
                    checked={method === "email"}
                    onChange={e => setMethod(e.target.value)}
                  />
                  <Mail className="w-4 h-4" />
                  Email
                </label>
              </div>
            </div>

            {/* Botón */}
            <button
              onClick={handleSendAlert}
              disabled={isLoading || !title.trim() || !message.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Alerta
                </>
              )}
            </button>
          </div>
        </div>

        {/* 📌 Historial de Alertas */}
        <div className="border rounded-2xl bg-white shadow-sm p-4 hover:shadow-md transition">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-2">
            <Clock className="w-5 h-5" /> Historial de Alertas
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Últimas notificaciones enviadas a la comunidad
          </p>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {alertHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay alertas registradas</p>
            ) : (
              alertHistory.map(alert => (
                <div
                  key={alert.id}
                  className="p-4 rounded-lg border border-gray-200 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(
                        alert.severity
                      )}`}
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
                    <span>
                      {new Date(alert.timestamp).toLocaleString("es-ES")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;