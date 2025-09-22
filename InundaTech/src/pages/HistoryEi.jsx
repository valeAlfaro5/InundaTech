import { useState, useEffect, useMemo } from "react";
import {
  Thermometer,
  Droplets,
  Wind,
  Calendar,
  Sun,
  Eye,
  Cloud,
  BarChart3,
  ChevronDown,
  ChevronRight
} from "lucide-react";

import { useRTDBConnection } from "../hooks/useRTDBConnection";
import { useRTDB } from "../hooks/useRTDB";

const FIREBASE_DB_URL = "https://inundatech-ecc38-default-rtdb.firebaseio.com";
const DEVICE_ID = "esp32-water-01";
const EPSILON_CM = 0.5;

const getRiskConfig = probability => {
  if (probability < 0.15) return { label: "Bajo", color: "bg-green-600 text-white", bgColor: "bg-green-50 border-green-200" };
  if (probability < 0.3)  return { label: "Moderado", color: "bg-yellow-500 text-white", bgColor: "bg-yellow-50 border-yellow-200", icon: "⚠️" };
  if (probability < 0.5)  return { label: "Alto", color: "bg-orange-500 text-white", bgColor: "bg-orange-50 border-orange-200" };
  return { label: "Muy Alto", color: "bg-red-600 text-white", bgColor: "bg-red-50 border-red-200" };
};

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState(null);
  const [error, setError] = useState(null);

  const conn = useRTDBConnection();
  const { data: latest } = useRTDB(`/devices/${DEVICE_ID}/last`);

  // ——— NUEVO: detectar cambios en el paquete
  const lastTs = latest?.ts ?? latest?.timestamp ?? null;

  // ===== Derivados del ESP32 =====
  const {
    distance,
    waterHeight,
    fillPct,
    MAX_DEPTH_CM,
    HEADSPACE_CM,
    USABLE_DEPTH_CM
  } = useMemo(() => {
    const MAX_DEPTH_CM =
      typeof latest?.max_depth_cm === "number" ? latest.max_depth_cm : 10;
    const HEADSPACE_CM =
      typeof latest?.headspace_cm === "number" ? latest.headspace_cm : 3;
    const USABLE_DEPTH_CM =
      typeof latest?.usable_depth_cm === "number"
        ? latest.usable_depth_cm
        : Math.max(0, MAX_DEPTH_CM - HEADSPACE_CM);

    const distance =
      typeof latest?.distance_cm === "number" ? latest.distance_cm : null;

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
        : typeof latest?.level_pct === "number"
        ? latest.level_pct
        : null;

    const isFull =
      waterHeight != null &&
      USABLE_DEPTH_CM > 0 &&
      waterHeight >= USABLE_DEPTH_CM - EPSILON_CM;
    if (isFull) fillPct = 100;

    if (waterHeight != null) waterHeight = Math.max(0, Math.min(USABLE_DEPTH_CM, waterHeight));
    if (fillPct != null) fillPct = Math.max(0, Math.min(100, fillPct));

    return {
      distance, waterHeight, fillPct, MAX_DEPTH_CM, HEADSPACE_CM, USABLE_DEPTH_CM
    };
  }, [latest]);

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

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) total de filas
      const countRes = await fetch(`http://127.0.0.1:8000/static/count?t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache" }, cache: "no-store",
      });
      if (!countRes.ok) throw new Error(`/static/count ${countRes.status}`);
      const { count } = await countRes.json();

      // 2) snapshot ESP32 para este corte
      const esp32 = buildEsp32Payload();

      // 3) predicciones por fila (desde el día 2; usa 0 si quieres incluir el 1er día)
      const startIndex = 1;
      const indices = Array.from({ length: Math.max(0, count - startIndex) }, (_, i) => i + startIndex);

      const reqs = indices.map(idx =>
        fetch(`http://127.0.0.1:8000/predict/static?t=${Date.now()}&row=${idx}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
          cache: "no-store",
          body: JSON.stringify({ row_index: idx, esp32 })
        })
        .then(r => {
          if (!r.ok) throw new Error(`row ${idx} -> ${r.status}`);
          return r.json();
        })
        .then(json => ({
          date: json.datetime || `row_${idx}`,
          features: json.weather || {},     // para tu UI actual
          risk_probability: json.risk_probability,
          risk_label: json.risk_bucket,
          row_index: idx
        }))
      );

      const results = await Promise.all(reqs);
      setHistory(results);
    } catch (err) {
      console.error("Error fetching history:", err);
      setError("No se pudieron obtener las predicciones del CSV.");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // ——— NUEVO: refrescar cuando cambie el paquete del ESP32
  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastTs]);

  const toggleExpanded = date => {
    setExpandedDate(expandedDate === date ? null : date);
  };

  if (loading) return <div className="p-6 text-center">Cargando datos...</div>;

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
            Predicciones de Riesgos y Condiciones ETA/IOTA
          </h2>
          <p className="text-gray-500 text-sm">
            Mostrando filas del CSV desde el día 02 (row_index = 1). Usa el snapshot actual del ESP32.
          </p>
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <span className="font-semibold">Predicciones estáticas por fila del CSV</span>
        </div>
        <div className="max-h-[600px] overflow-y-auto p-4 space-y-2">
          {history.length > 0 ? (
            history.map(item => {
              const riskConfig = getRiskConfig(item.risk_probability);
              const isExpanded = expandedDate === item.date;

              return (
                <div key={`${item.date}_${item.row_index}`} className="border rounded-lg overflow-hidden">
                  <div
                    className={`p-4 flex justify-between items-center cursor-pointer ${riskConfig.bgColor}`}
                    onClick={() => toggleExpanded(item.date)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">
                        {item.date} <span className="text-xs text-gray-500">(row {item.row_index})</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex gap-4 text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <Thermometer className="h-4 w-4" />
                          <span>{item.features?.temp != null ? Number(item.features.temp).toFixed(1) : "—"}°C</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Droplets className="h-4 w-4" />
                          <span>{item.features?.humidity != null ? Number(item.features.humidity).toFixed(1) : "—"}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Droplets className="h-4 w-4" />
                          <span>{item.features?.precip != null ? Number(item.features.precip).toFixed(2) : "—"} mm</span>
                        </div>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${riskConfig.color}`}>
                        {riskConfig.icon} {riskConfig.label}
                      </span>

                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {(item.risk_probability * 100).toFixed(1)}%
                        </div>
                        <div className="w-20 h-2 bg-gray-200 rounded">
                          <div className="h-2 bg-blue-500 rounded" style={{ width: `${item.risk_probability * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 bg-gray-50 border-t grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Wind className="h-4 w-4 text-blue-600" />
                        <div>
                          <p>Velocidad viento</p>
                          <p className="font-bold">
                            {item.features?.windspeed != null ? Number(item.features.windspeed).toFixed(1) : "—"} km/h
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-yellow-600" />
                        <div>
                          <p>Radiación solar</p>
                          <p className="font-bold">
                            {item.features?.solarradiation != null ? Number(item.features.solarradiation).toFixed(0) : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-purple-600" />
                        <div>
                          <p>Visibilidad</p>
                          <p className="font-bold">
                            {item.features?.visibility != null ? Number(item.features.visibility).toFixed(1) : "—"} km
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Cloud className="h-4 w-4 text-gray-600" />
                        <div>
                          <p>Nubosidad</p>
                          <p className="font-bold">
                            {item.features?.cloudcover != null ? Number(item.features.cloudcover).toFixed(1) : "—"}%
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-teal-600" />
                        <div>
                          <p>Punto de rocío</p>
                          <p className="font-bold">
                            {item.features?.dew != null ? Number(item.features.dew).toFixed(1) : "—"}°C
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-yellow-500" />
                        <div>
                          <p>Índice UV</p>
                          <p className="font-bold">
                            {item.features?.uvindex != null ? Number(item.features.uvindex).toFixed(1) : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="h-8 w-8 mx-auto mb-2" />
              No hay datos disponibles
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
