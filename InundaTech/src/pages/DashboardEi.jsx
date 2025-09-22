import { useState, useEffect, useRef } from "react";
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

import ConnectionBadge from "../components/ConnectionBadge";
import { useRTDBConnection } from "../hooks/useRTDBConnection";
import { useRTDB } from "../hooks/useRTDB";

const FIREBASE_DB_URL = "https://inundatech-ecc38-default-rtdb.firebaseio.com";
const EPSILON_CM = 0.5; // tolerancia 5 mm para marcar 100%

const getRiskColor = (probability) => {
  if (probability < 0.15)
    return { label: "Bajo", className: "bg-green-100 text-green-800 border-green-300" };
  if (probability < 0.3)
    return { label: "Moderado", className: "bg-yellow-100 text-yellow-800 border-yellow-300" };
  if (probability < 0.5)
    return { label: "Alto", className: "bg-orange-100 text-orange-800 border-orange-300" };
  return { label: "Muy Alto", className: "bg-red-100 text-red-800 border-red-300" };
};

const Mensaje = (prob) => {
  if (prob < 0.15) return "✅ Condiciones normales. Continuar con monitoreo rutinario.";
  if (prob < 0.3) return "⚠️ Condiciones a observar. Mantener estado de alerta.";
  if (prob < 0.5) return "🚨 Riesgo elevado. Preparar medidas preventivas inmediatas.";
  return "🆘 Riesgo crítico. Activar protocolos de emergencia ahora.";
};

// formateo del timestamp (millis desde arranque o epoch ms)
const formatTs = (ts) => {
  if (ts == null) return "—";
  if (ts > 1e12) return new Date(ts).toLocaleString();
  const secs = Math.floor(ts / 1000);
  return `${secs}s desde arranque`;
};

export default function DashboardEi() {
  const [data, setData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState(null);
  const isTesting = true;

  // índice de fila del CSV (día 01 -> 0)
  const [currentRow, setCurrentRow] = useState(0);
  const [totalRows, setTotalRows] = useState(null); // opcional

  // conexión
  const conn = useRTDBConnection();

  // live ESP32
  const DEVICE_ID = "esp32-water-01";
  const { data: latest, error: rtError } = useRTDB(`/devices/${DEVICE_ID}/last`);

  // ——— NUEVO: detectar cambios reales en el paquete del ESP32
  const lastTs = latest?.ts ?? latest?.timestamp ?? null;

  // evitar duplicar alertas
  const lastAlertRef = useRef(null);

  // ——— NUEVO: cancelar peticiones antiguas
  const abortRef = useRef(null);

  // cargar cantidad de filas (si quieres acotar “Siguiente”)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`http://127.0.0.1:8000/static/count?t=${Date.now()}`, {
          headers: { "Cache-Control": "no-cache" }, cache: "no-store",
        });
        const j = await r.json();
        if (typeof j?.count === "number") setTotalRows(j.count);
      } catch { /* opcional */ }
    })();
  }, []);

  const handleSendAlert = async (riskProbability) => {
    const riskMsg = Mensaje(riskProbability);
    const riskLevel = getRiskColor(riskProbability).label;
    const fullMessage = `${riskMsg}\n\nNivel de severidad: **${riskLevel}**`;

    try {
      const response = await fetch("http://localhost:3000/sendAlert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Alerta de Inundación - Riesgo ${(riskProbability * 100).toFixed(1)}%`,
          message: fullMessage,
          method: "email",
          severity: riskLevel,
        }),
      });
      if (!response.ok) throw new Error("Error enviando alerta");
    } catch (err) {
      console.error("Error enviando alerta:", err.message);
    }
  };

  // ===== DERIVADOS DEL ESP32 =====
  const MAX_DEPTH_CM =
    typeof latest?.max_depth_cm === "number" ? latest.max_depth_cm : 10;
  const HEADSPACE_CM =
    typeof latest?.headspace_cm === "number" ? latest.headspace_cm : 3;
  const USABLE_DEPTH_CM =
    typeof latest?.usable_depth_cm === "number"
      ? latest.usable_depth_cm
      : Math.max(0, MAX_DEPTH_CM - HEADSPACE_CM);

  const apiEsp32 = data?.esp32 || {};

  const distance =
    typeof latest?.distance_cm === "number"
      ? latest.distance_cm
      : typeof apiEsp32?.distance_cm === "number"
      ? apiEsp32.distance_cm
      : null;

  let waterHeight =
    typeof latest?.water_height_cm === "number"
      ? latest.water_height_cm
      : distance != null
      ? Math.max(0, Math.min(USABLE_DEPTH_CM, MAX_DEPTH_CM - distance))
      : null;

  let fillPct =
    typeof latest?.fill_pct === "number"
      ? latest.fill_pct
      : waterHeight != null && USABLE_DEPTH_CM > 0
      ? (waterHeight / USABLE_DEPTH_CM) * 100
      : typeof apiEsp32?.level_pct === "number"
      ? apiEsp32.level_pct
      : null;

  const isFull =
    waterHeight != null &&
    USABLE_DEPTH_CM > 0 &&
    waterHeight >= USABLE_DEPTH_CM - EPSILON_CM;

  if (isFull) fillPct = 100;

  if (waterHeight != null) waterHeight = Math.max(0, Math.min(USABLE_DEPTH_CM, waterHeight));
  if (fillPct != null) fillPct = Math.max(0, Math.min(100, fillPct));

  // registrar alerta 100%
  useEffect(() => {
    if (!latest || !isFull) return;
    const tsKey = latest.ts ?? Date.now();
    if (lastAlertRef.current === tsKey) return;
    lastAlertRef.current = tsKey;

    const payload = {
      device_id: latest.device_id ?? DEVICE_ID,
      type: "FULL_TANK",
      message: "Nivel de agua alcanzó el 100% de la profundidad útil.",
      max_depth_cm: MAX_DEPTH_CM,
      headspace_cm: HEADSPACE_CM,
      usable_depth_cm: USABLE_DEPTH_CM,
      water_height_cm: waterHeight ?? null,
      fill_pct: fillPct ?? null,
      overfill_guard: Boolean(latest?.overfill_guard),
      ts: latest.ts ?? Date.now(),
    };

    fetch(`${FIREBASE_DB_URL}/alerts.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }, [latest, isFull, MAX_DEPTH_CM, HEADSPACE_CM, USABLE_DEPTH_CM, waterHeight, fillPct]);

  // ===== API (CSV estático + ESP32 dinámico) =====
  const buildEsp32Payload = () => {
    const payload = {};
    if (typeof distance === "number") payload.distance_cm = distance;
    if (typeof fillPct === "number") payload.level_pct = fillPct;
    if (typeof MAX_DEPTH_CM === "number") payload.max_depth_cm = MAX_DEPTH_CM;
    if (typeof HEADSPACE_CM === "number") payload.headspace_cm = HEADSPACE_CM;
    if (typeof USABLE_DEPTH_CM === "number") payload.usable_depth_cm = USABLE_DEPTH_CM;
    if (typeof waterHeight === "number") payload.water_height_cm = waterHeight;
    return payload;
  };

  const fetchRisk = async (rowIndex = currentRow) => {
    try {
      setError(null);

      // cancelar petición anterior si sigue viva
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      const esp32 = buildEsp32Payload();

      const res = await fetch(`http://127.0.0.1:8000/predict/static?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        cache: "no-store",
        signal: abortRef.current.signal,
        body: JSON.stringify({ row_index: rowIndex, esp32 }),
      });

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
      if (err.name === "AbortError") return;
      console.error("Error fetching risk:", err);
      setError("No se pudo obtener datos del servidor.");
    }
  };

  // ——— NUEVO: fetch inmediato y cuando cambie el día o el paquete (ts)
  useEffect(() => {
    fetchRisk(currentRow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRow, lastTs]);

  // ——— NUEVO: polling que se reinicia si cambia el día o el ts
  useEffect(() => {
    const id = setInterval(() => fetchRisk(currentRow), 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRow, lastTs]);

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/20 to-cyan-50/30">
        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex justify-end mb-4">
            <ConnectionBadge conn={conn} error={error || rtError} />
          </div>
          <p className="text-center text-gray-500 mt-10">Cargando datos...</p>
        </main>
      </div>
    );
  }

  const risk = getRiskColor(data.risk_probability);
  const weather = data.weather || {};
  const uiDate = data.datetime || weather.datetime || "—";

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/20 to-cyan-50/30">
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex justify-end mb-4">
          <ConnectionBadge conn={conn} error={error || rtError} />
        </div>

        {/* Encabezado + selector de día */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-500/20 to-teal-500/20 p-8 md:p-12">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Río InundaTech</h2>
              <p className="text-gray-600 text-lg">Monitoreo en tiempo real</p>
              <div className="flex items-center text-gray-600 mt-2">
                <Clock className="h-4 w-4 mr-2" />
                <span>Fila CSV (día): {String(currentRow + 1).padStart(2, "0")} — {uiDate}</span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => setCurrentRow((r) => Math.max(0, r - 1))}
                  className="px-4 py-2 bg-white/80 border rounded-lg hover:bg-white transition"
                >
                  ◀ Anterior
                </button>
                <button
                  onClick={() =>
                    setCurrentRow((r) =>
                      totalRows != null ? Math.min(totalRows - 1, r + 1) : r + 1
                    )
                  }
                  className="px-4 py-2 bg-white/80 border rounded-lg hover:bg-white transition"
                >
                  Siguiente ▶
                </button>
                <span className="text-xs text-gray-500">
                  (Día 01 corresponde a row_index = 0)
                </span>
              </div>
            </div>
            <div className="text-center lg:text-right">
              <span className={`px-6 py-3 text-xl font-bold border-2 rounded-lg ${risk.className}`}>
                {risk.label}
              </span>
              <p className="text-gray-600 mt-2 text-lg">
                {(data.risk_probability * 100).toFixed(1)}% probabilidad
              </p>
              <p className="text-xs text-gray-500">Última act.: {lastUpdate}</p>
            </div>
          </div>
        </div>

        {/* Métricas principales – clima estático del CSV */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
          <MetricCard
            title="Temperatura"
            value={weather?.temp != null ? `${Number(weather.temp).toFixed(1)}°C` : "—"}
            icon={<Thermometer className="h-8 w-8 text-white" />}
            gradient="from-red-500 to-orange-500"
          />
          <MetricCard
            title="Humedad"
            value={weather?.humidity != null ? `${Number(weather.humidity).toFixed(1)}%` : "—"}
            icon={<Droplets className="h-8 w-8 text-white" />}
            gradient="from-blue-500 to-cyan-500"
          />
          <MetricCard
            title="Condición"
            value={`${weather?.condition ?? "—"}`}
            icon={<Cloud className="h-8 w-8 text-white" />}
            gradient="from-green-500 to-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <SmallMetric
            title="Se siente"
            value={weather?.feelslike != null ? `${Number(weather.feelslike).toFixed(1)}°C` : "—"}
            icon={<Wind className="h-6 w-6 text-blue-600" />}
          />
          <SmallMetric
            title="Punto de Rocío"
            value={weather?.dew != null ? `${Number(weather.dew).toFixed(1)}°C` : "—"}
            icon={<Droplet className="h-6 w-6 text-yellow-600" />}
          />
          <SmallMetric
            title="Precipitación"
            value={weather?.precip != null ? `${weather.precip}` : "—"}
            icon={<CloudRain className="h-6 w-6 text-gray-600" />}
          />
          <SmallMetric
            title="Visibilidad"
            value={weather?.visibility != null ? `${Number(weather.visibility).toFixed(1)} km` : "—"}
            icon={<Eye className="h-6 w-6 text-purple-600" />}
          />
        </div>

        {/* Datos del ESP32 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mt-10">
          <h3 className="text-xl font-bold flex items-center space-x-3 mb-6">
            <Activity className="h-5 w-5 text-blue-600" />
            <span>Detalles del nivel del Agua</span>
          </h3>

          {rtError && <p className="mb-4 text-red-600 text-sm">Error leyendo RTDB: {rtError}</p>}

          {latest || data.esp32 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <p className="mb-2 font-medium">
                  <strong>Distancia sensor → agua:</strong>{" "}
                  {distance != null ? `${distance.toFixed(2)} cm` : "—"}
                </p>
                <p className="mb-2 font-medium">
                  <strong>Margen de seguridad (headspace):</strong>{" "}
                  {HEADSPACE_CM?.toFixed ? `${HEADSPACE_CM.toFixed(2)} cm` : `${HEADSPACE_CM} cm`}
                </p>
                <p className="mb-2 font-medium">
                  <strong>Altura de agua (útil):</strong>{" "}
                  {waterHeight != null
                    ? `${waterHeight.toFixed(2)} cm / ${USABLE_DEPTH_CM.toFixed(2)} cm`
                    : "—"}
                </p>
                <p className="mb-2 font-medium">
                  <strong>Nivel de llenado:</strong>{" "}
                  {fillPct != null ? `${fillPct.toFixed(1)} %` : "—"}
                </p>
              </div>

              <p className="mb-4 text-gray-600">
                <strong>Timestamp:</strong>{" "}
                {latest?.ts != null ? formatTs(latest.ts) : data.esp32 ? "(desde API)" : "—"}
              </p>

              {(Boolean(latest?.overfill_guard) || isFull) && (
                <div className="mb-4 text-sm p-3 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800">
                  {isFull
                    ? "Tanque lleno (100% de la profundidad útil)."
                    : "Aviso: el nivel de agua está dentro del margen de seguridad del sensor."}
                </div>
              )}

              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-4 bg-blue-500 transition-all duration-500"
                  style={{ width: `${fillPct ?? 0}%` }}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={fillPct ?? 0}
                  role="progressbar"
                  title={fillPct != null ? `${fillPct.toFixed(1)}%` : "0%"}
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
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300`}></div>
      <div className="relative bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl p-8 text-center">
        <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${gradient} rounded-full mb-4`}>{icon}</div>
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
