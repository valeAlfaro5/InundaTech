import { useState, useEffect } from "react";
import {
  Activity,
  Droplets,
  Clock,
  Thermometer,
  Wind,
  Eye,
  Cloud,
  CloudRain,
  Droplet,
} from "lucide-react";

// IMPORTS AGREGADOS
import ConnectionBadge from "../components/ConnectionBadge";
import { useRTDBConnection } from "../hooks/useRTDBConnection";
import { useRTDB } from "../hooks/useRTDB";

const getRiskColor = (probability) => {
  if (probability < 0.15)
    return {
      label: "Bajo",
      className: "bg-green-100 text-green-800 border-green-300",
    };
  if (probability < 0.3)
    return {
      label: "Moderado",
      className: "bg-yellow-100 text-yellow-800 border-yellow-300",
    };
  if (probability < 0.5)
    return {
      label: "Alto",
      className: "bg-orange-100 text-orange-800 border-orange-300",
    };
  return {
    label: "Muy Alto",
    className: "bg-red-100 text-red-800 border-red-300",
  };
};

const Mensaje = (prob) => {
  if (prob < 0.15)
    return "✅ Condiciones normales. Continuar con monitoreo rutinario.";
  if (prob < 0.3)
    return "⚠️ Condiciones a observar. Mantener estado de alerta.";
  if (prob < 0.5)
    return "🚨 Riesgo elevado. Preparar medidas preventivas inmediatas.";
  return "🆘 Riesgo crítico. Activar protocolos de emergencia ahora.";
};

// 🔧 formateo del timestamp que manda el ESP32 (millis desde arranque)
// si en el futuro envías epoch ms real (>1e12), se verá como fecha/hora local
const formatTs = (ts) => {
  if (ts == null) return "—";
  if (ts > 1e12) return new Date(ts).toLocaleString();
  const secs = Math.floor(ts / 1000);
  return `${secs}s desde arranque`;
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState(null);
  const isTesting = false;

  // ➕ HOOK DE CONEXIÓN (solo lectura del estado de Firebase)
  const conn = useRTDBConnection();

  // 🔴 LECTURA EN VIVO DEL ÚLTIMO PAQUETE DEL ESP32
  const DEVICE_ID = "esp32-water-01";
  const { data: latest, error: rtError } = useRTDB(`/devices/${DEVICE_ID}/last`);

  // (opcional) si también lees un nodo de riesgo en RTDB:
  // const { data: rtRealtime } = useRTDB("/inundatech/realtime");
  // const liveRisk = rtRealtime?.risk_probability ?? data?.risk_probability;

  // Envío de alertas
  const handleSendAlert = async (riskProbability) => {
    const riskMsg = Mensaje(riskProbability);
    const riskLevel = getRiskColor(riskProbability).label;
    const fullMessage = `${riskMsg}\n\nNivel de severidad: **${riskLevel}**`;

    try {
      const response = await fetch("http://localhost:3000/sendAlert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Alerta de Inundación - Riesgo ${(
            riskProbability * 100
          ).toFixed(1)}%`,
          message: fullMessage,
          method: "email",
          severity: riskLevel,
        }),
      });

      if (!response.ok) throw new Error("Error enviando alerta");
      console.log("Alerta enviada por email");
    } catch (err) {
      console.error("Error enviando alerta:", err.message);
    }
  };

  const fetchRisk = async () => {
    try {
      setError(null);
      const res = await fetch("http://127.0.0.1:8000/predict_realtime");

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const json = await res.json();
      setData(json);
      setLastUpdate(new Date().toLocaleTimeString());
      setIsConnected(true);

      const risk = getRiskColor(json.risk_probability);
      if (isTesting || risk.label !== "Bajo") {
        handleSendAlert(json.risk_probability);
      }
    } catch (err) {
      console.error("Error fetching risk:", err);
      setError("No se pudo obtener datos del servidor.");
    }
  };

  useEffect(() => {
    fetchRisk();
    const interval = setInterval(fetchRisk, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/20 to-cyan-50/30">
        <main className="max-w-7xl mx-auto px-6 py-12">
          {/* ➕ BADGE ARRIBA A LA DERECHA */}
          <div className="flex justify-end mb-4">
            <ConnectionBadge conn={conn} error={error || rtError} />
          </div>
          <p className="text-center text-gray-500 mt-10">Cargando datos...</p>
        </main>
      </div>
    );
  }

  const risk = getRiskColor(data.risk_probability);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/20 to-cyan-50/30">
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex justify-end mb-4">
          <ConnectionBadge conn={conn} error={error || rtError} />
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-500/20 to-teal-500/20 p-8 md:p-12">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                Río InundaTech
              </h2>
              <p className="text-gray-600 text-lg">Monitoreo en tiempo real</p>
              <div className="flex items-center text-gray-600 mt-2">
                <Clock className="h-4 w-4 mr-2" />
                <span>Última lectura: {data.datetime}</span>
              </div>
            </div>
            <div className="text-center lg:text-right">
              <span
                className={`px-6 py-3 text-xl font-bold border-2 rounded-lg ${risk.className}`}
              >
                {risk.label}
              </span>
              <p className="text-gray-600 mt-2 text-lg">
                {(data.risk_probability * 100).toFixed(1)}% probabilidad
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
          <MetricCard
            title="Temperatura"
            value={`${data.features.temp.toFixed(1)}°C`}
            icon={<Thermometer className="h-8 w-8 text-white" />}
            gradient="from-red-500 to-orange-500"
          />
          <MetricCard
            title="Humedad"
            value={`${data.features.humidity.toFixed(1)}%`}
            icon={<Droplets className="h-8 w-8 text-white" />}
            gradient="from-blue-500 to-cyan-500"
          />
          <MetricCard
            title="Condición"
            value={`${data.features.condition}`}
            icon={<Cloud className="h-8 w-8 text-white" />}
            gradient="from-green-500 to-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <SmallMetric
            title="Se siente"
            value={`${data.features.feelslike.toFixed(1)}°C`}
            icon={<Wind className="h-6 w-6 text-blue-600" />}
          />
          <SmallMetric
            title="Punto de Rocío"
            value={`${data.features.dew.toFixed(1)}°C`}
            icon={<Droplet className="h-6 w-6 text-yellow-600" />}
          />
          <SmallMetric
            title="Precipitación"
            value={`${data.features.precip}`}
            icon={<CloudRain className="h-6 w-6 text-gray-600" />}
          />
          <SmallMetric
            title="Visibilidad"
            value={`${data.features.visibility.toFixed(1)} km`}
            icon={<Eye className="h-6 w-6 text-purple-600" />}
          />
        </div>

        {/* Datos del ESP32 (RTDB en vivo, último envío) */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mt-10">
          <h3 className="text-xl font-bold flex items-center space-x-3 mb-6">
            <Activity className="h-5 w-5 text-blue-600" />
            <span>Detalles del nivel del Agua</span>
          </h3>

          {/* Error de RTDB si aplica */}
          {rtError && (
            <p className="mb-4 text-red-600 text-sm">
              Error leyendo RTDB: {rtError}
            </p>
          )}

          {latest ? (
            <>
              <p className="mb-2 font-medium">
                <strong>Distancia:</strong>{" "}
                {latest.distance_cm != null
                  ? `${latest.distance_cm.toFixed(2)} cm`
                  : "—"}
              </p>

              <p className="mb-2 font-medium">
                <strong>Nivel de llenado:</strong>{" "}
                {latest.level_pct != null
                  ? `${latest.level_pct.toFixed(1)} %`
                  : "—"}
              </p>

              <p className="mb-4 text-gray-600">
                <strong>Timestamp:</strong> {formatTs(latest.ts)}
              </p>

              {/* Barra de llenado usando level_pct */}
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-4 bg-blue-500 transition-all duration-500"
                  style={{ width: `${latest.level_pct ?? 0}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-gray-500">Esperando datos en tiempo real…</p>
          )}
        </div>
      </main>
    </div>
  );
}

function MetricCard({ title, value, icon, gradient }) {
  return (
    <div className="relative group">
      <div
        className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300`}
      ></div>
      <div className="relative bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl p-8 text-center">
        <div
          className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${gradient} rounded-full mb-4`}
        >
          {icon}
        </div>
        <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
        <p className="text-gray-500 font-medium">{title}</p>
      </div>
    </div>
  );
}

function SmallMetric({ title, value, icon }) {
  return (
    <div className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl hover:shadow-lg transition-all duration-300 p-6 text-center">
      <div className="mx-auto mb-2">{icon}</div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{title}</p>
    </div>
  );
}
