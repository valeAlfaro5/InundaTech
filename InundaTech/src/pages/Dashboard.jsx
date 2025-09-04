import { useState, useEffect } from 'react';
import { 
  Activity, TrendingUp, TrendingDown, Wind,SunMedium,Cloud,Eye, MapPin, Clock, Thermometer, Waves 
} from 'lucide-react';

const getRiskColor = (p) => {
  if (p < 0.15) return { label: "Bajo", className: "bg-green-100 text-green-800" };
  if (p < 0.30) return { label: "Moderado", className: "bg-yellow-100 text-yellow-800" };
  if (p < 0.50) return { label: "Alto", className: "bg-orange-100 text-orange-800" };
  return { label: "Muy Alto", className: "bg-red-100 text-red-800" };
};

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());

  const fetchRisk = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/predict_realtime");
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Error fetching risk:", err);
    }
  };

  useEffect(() => {
    fetchRisk();
    const interval = setInterval(fetchRisk, 60000); // refresca cada 1 min
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return <p className="text-center text-gray-500 mt-10">Cargando datos...</p>;
  }

  const risk = getRiskColor(data.risk_probability);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <header className="mb-6 text-center">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">
          Dashboard de Monitoreo
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          Última actualización: {lastUpdate}
        </p>
      </header>

      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-3xl font-bold">Rio InundaTech</h3>
            <p className="flex items-center text-gray-600 text-lg mt-1">
              <MapPin className="h-5 w-5 mr-1" /> {"San Pedro Sula, Cortés, Honduras"}
            </p>
          </div>
          <span className={`px-4 py-2 rounded-full text-lg font-semibold ${risk.className}`}>
            {risk.label} ({(data.risk_probability * 100).toFixed(1)}%)
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-blue-50 rounded-xl p-4">
            <Thermometer className="mx-auto h-6 w-6 text-blue-500" />
            <p className="text-lg font-semibold">{data.features.temp}°C</p>
            <p className="text-gray-500 text-sm">Temperatura</p>
          </div>
          <div className="bg-cyan-50 rounded-xl p-4">
            <Waves className="mx-auto h-6 w-6 text-cyan-500" />
            <p className="text-lg font-semibold">{data.features.humidity}%</p>
            <p className="text-gray-500 text-sm">Humedad</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4">
            <Clock className="mx-auto h-6 w-6 text-yellow-500" />
            <p className="text-lg font-semibold">{data.datetime}</p>
            <p className="text-gray-500 text-sm">Hora del dato</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-center">
          <div className="p-4 bg-pink-50 rounded-lg shadow-sm">
            <Wind className="mx-auto h-6 w-6 text-pink-500" />
            <p className="font-semibold">{data.features.windspeed} mph</p>
            <p className="text-sm text-gray-500">Viento</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg shadow-sm">
            <SunMedium className="mx-auto h-6 w-6 text-orange-500" />
            <p className="font-semibold">{data.features.uvindex} mph</p>
            <p className="text-sm text-gray-500">Rayos UV</p>
          </div>
          <div className="p-4 bg-teal-50 rounded-lg shadow-sm">
            <Cloud className="mx-auto h-6 w-6 text-teal-500" />
            <p className="font-semibold">{data.features.cloudcover}%</p>
            <p className="text-sm text-gray-500">Nubosidad</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg shadow-sm">
            <Eye className="mx-auto h-6 w-6 text-purple-500" />
            <p className="font-semibold">{data.features.visibility} km</p>
            <p className="text-sm text-gray-500">Visibilidad</p>
          </div>
        </div>
      </div>
    </div>
  );
};
