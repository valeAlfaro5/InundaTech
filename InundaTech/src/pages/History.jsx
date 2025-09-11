import { useState, useEffect } from "react"
import {
  Thermometer,
  Droplets,
  Wind,
  Calendar,
  Sun,
  Eye,
  Cloud,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronRight
} from "lucide-react"

const getRiskConfig = probability => {
  if (probability < 0.15)
    return {
      label: "Bajo",
      color: "bg-green-600 text-white",
      bgColor: "bg-green-50 border-green-200",
    }
  if (probability < 0.3)
    return {
      label: "Moderado",
      color: "bg-yellow-500 text-white",
      bgColor: "bg-yellow-50 border-yellow-200",
      icon: "⚠️"
    }
  if (probability < 0.5)
    return {
      label: "Alto",
      color: "bg-orange-500 text-white",
      bgColor: "bg-orange-50 border-orange-200",
    }
  return {
    label: "Muy Alto",
    color: "bg-red-600 text-white",
    bgColor: "bg-red-50 border-red-200",
  }
}

export default function History() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedDate, setExpandedDate] = useState(null)

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/predict_daily")

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const json = await res.json()
      setHistory(
        Array.isArray(json.daily_predictions) ? json.daily_predictions : []
      )
    } catch (err) {
      console.error("Error fetching history:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const toggleExpanded = date => {
    setExpandedDate(expandedDate === date ? null : date)
  }

  if (loading) {
    return <div className="p-6 text-center">Cargando datos...</div>
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
            Predicciones de Riesgos y Condiciones 
          </h2>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <span className="font-semibold">Predicciones Detalladas de los últimos 15 días</span>
        </div>
        <div className="max-h-[600px] overflow-y-auto p-4 space-y-2">
          {history.length > 0 ? (
            history.map(item => {
              const riskConfig = getRiskConfig(item.risk_probability)
              const isExpanded = expandedDate === item.date

              return (
                <div
                  key={item.date}
                  className="border rounded-lg overflow-hidden"
                >
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
                      <span className="font-medium">{(item.date)}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex gap-4 text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <Thermometer className="h-4 w-4" />
                          <span>{item.features.temp.toFixed(1)}°C</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Droplets className="h-4 w-4" />
                          <span>{item.features.humidity.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Droplets className="h-4 w-4" />
                          <span>{item.features.precip.toFixed(2)} mm</span>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${riskConfig.color}`}
                      >
                        {riskConfig.icon} {riskConfig.label}
                      </span>

                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {(item.risk_probability * 100).toFixed(1)}%
                        </div>
                        <div className="w-20 h-2 bg-gray-200 rounded">
                          <div
                            className="h-2 bg-blue-500 rounded"
                            style={{ width: `${item.risk_probability * 100}%` }}
                          ></div>
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
                            {item.features.windspeed?.toFixed(1)} km/h
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                        <div>
                          <p>Ráfagas</p>
                          <p className="font-bold">
                            {item.features.windgust?.toFixed(1)} km/h
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-yellow-600" />
                        <div>
                          <p>Radiación solar</p>
                          <p className="font-bold">
                            {item.features.solarradiation?.toFixed(0)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-purple-600" />
                        <div>
                          <p>Visibilidad</p>
                          <p className="font-bold">
                            {item.features.visibility?.toFixed(1)} km
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Cloud className="h-4 w-4 text-gray-600" />
                        <div>
                          <p>Nubosidad</p>
                          <p className="font-bold">
                            {item.features.cloudcover?.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-teal-600" />
                        <div>
                          <p>Punto de rocío</p>
                          <p className="font-bold">
                            {item.features.dew?.toFixed(1)}°C
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-yellow-500" />
                        <div>
                          <p>Índice UV</p>
                          <p className="font-bold">
                            {item.features.uvindex?.toFixed(1)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-orange-500" />
                        <div>
                          <p>Energía solar</p>
                          <p className="font-bold">
                            {item.features.solarenergy?.toFixed(1)} kWh
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
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
  )
}
