import { useState, useEffect } from "react";
import { Thermometer, Droplets, Wind, Calendar, Sun, Eye } from "lucide-react";

export default function History() {
  const [history, setHistory] = useState([]);
  const [expandedDate, setExpandedDate] = useState(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/predict_daily");
      const json = await res.json();
      setHistory(Array.isArray(json.daily_predictions) ? json.daily_predictions : []);
    } catch (err) {
      console.error("Error fetching risk:", err);
      setHistory([]);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const toggleExpand = (date) => {
    setExpandedDate(expandedDate === date ? null : date);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <header className="mb-6 text-center">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">
          Predicciones de Riesgos y Condiciones
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          Predicciones de riesgo y condiciones ambientales diarias para los proximos 15 días
        </p>
      </header>

      <div className="border rounded-2xl bg-white shadow-md rounded-xl p-4 flex-2 overflow-y-auto max-h-[76vh]">
        <div className="space-y-4 pr-2">
          {Array.isArray(history) && history.length > 0 ? (
            history.map((item) => {
              const {
                date,
                features = {},
                risk_probability = 0,
              } = item;
              const {
                temp = 0,
                humidity = 0,
                // windspeed = 0,
                precip = 0,
                windgust,
                cloudcover,
                visibility,
                solarradiation,
                solarenergy,
                dew,
                uvindex,
              } = features;

              return (
                <div key={date} className="border rounded-lg shadow-sm">
                  <div
                    className={`p-4 flex justify-between items-center cursor-pointer ${
                      risk_probability < 0.15
                        ? "bg-green-50 border-green-200"
                        : risk_probability < 0.3
                        ? "bg-yellow-50 border-yellow-200"
                        : risk_probability < 0.5
                        ? "bg-orange-50 border-orange-200"
                        : "bg-red-50 border-red-200"
                    }`}
                    onClick={() => toggleExpand(date)}
                  >
                    <div className="font-semibold flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-gray-500" />
                      {date}
                    </div>

                    <div className="flex gap-6 text-sm text-gray-700">
                      <span className="flex items-center gap-1">
                        <Thermometer className="w-4 h-4" />
                        {temp.toFixed(1)}°C
                      </span>
                      <span className="flex items-center gap-1">
                        <Droplets className="w-4 h-4" />
                        {humidity.toFixed(1)}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Droplets className="w-4 h-4" />
                        {precip.toFixed(2)} in
                      </span>
                    </div>

                    <div className="font-bold">
                      Riesgo: {(risk_probability * 100).toFixed(1)}%
                    </div>
                  </div>
                  {expandedDate === date && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200 text-gray-700 space-y-2 text-sm">
                      <div className="flex gap-4 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Wind className="w-4 h-4" /> Velocidad ráfaga: {windgust?.toFixed(1) ?? "N/A"} mph
                        </span>
                        <span className="flex items-center gap-1">
                          <Sun className="w-4 h-4" /> Radiación solar: {solarradiation?.toFixed(1) ?? "N/A"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Sun className="w-4 h-4" /> Energía solar: {solarenergy?.toFixed(1) ?? "N/A"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Droplets className="w-4 h-4" /> Punto de rocío: {dew?.toFixed(1) ?? "N/A"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" /> Visibilidad: {visibility?.toFixed(1) ?? "N/A"} mi
                        </span>
                        <span className="flex items-center gap-1">
                          ☁️ Cobertura nublada: {cloudcover?.toFixed(1) ?? "N/A"}%
                        </span>
                        <span className="flex items-center gap-1">
                          UV Index: {uvindex?.toFixed(1) ?? "N/A"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center text-gray-400 py-10">
              Cargando historial...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
