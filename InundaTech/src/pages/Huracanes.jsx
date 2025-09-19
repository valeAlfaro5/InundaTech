import { useState } from "react"
import {
  Calendar,
  Search,
  Thermometer,
  Droplets,
  Wind,
  Eye,
  Sun,
  AlertTriangle
} from "lucide-react"

// Función para formatear fechas en español
const formatDate = (date, options = {}) => {
  return date.toLocaleDateString("es-ES", options)
}

const Huracanes = () => {
  const [selectedDate, setSelectedDate] = useState(undefined)
  const [historicalData, setHistoricalData] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedDate, setExpandedDate] = useState(null)

  // Fechas predefinidas de huracanes importantes
  const hurricaneDates = [
    { name: "Huracán Eta", date: new Date(2020, 10, 3) }, // 3 Nov 2020
    { name: "Huracán Iota", date: new Date(2020, 10, 16) }, // 16 Nov 2020
    { name: "Huracán Mitch", date: new Date(1998, 9, 26) } // 26 Oct 1998
  ]

  const fetchHistoricalData = async startDate => {
    setLoading(true)
    try {
      const mockData = []
      for (let i = 0; i < 15; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)

        const isHurricaneDate = hurricaneDates.some(
          h =>
            Math.abs(h.date.getTime() - startDate.getTime()) <
            24 * 60 * 60 * 1000
        )

        const baseRisk = isHurricaneDate
          ? 0.7 + Math.random() * 0.3
          : 0.1 + Math.random() * 0.4
        const riskFactor = Math.max(0.3, 1 - i * 0.05)

        mockData.push({
          date: date.toISOString(),
          features: {
            temp: 24 + Math.random() * 8 + (isHurricaneDate ? 3 : 0),
            humidity: 70 + Math.random() * 25 + (isHurricaneDate ? 10 : 0),
            precip: Math.random() * (isHurricaneDate ? 8 : 3),
            windgust: 20 + Math.random() * (isHurricaneDate ? 80 : 30),
            cloudcover: 40 + Math.random() * (isHurricaneDate ? 60 : 40),
            visibility: Math.max(
              1,
              15 - Math.random() * (isHurricaneDate ? 10 : 5)
            ),
            solarradiation: Math.max(
              0,
              300 - Math.random() * (isHurricaneDate ? 200 : 100)
            ),
            solarenergy: Math.max(
              0,
              25 - Math.random() * (isHurricaneDate ? 15 : 8)
            ),
            dew: 18 + Math.random() * 8,
            uvindex: Math.max(0, 8 - Math.random() * (isHurricaneDate ? 6 : 3))
          },
          risk_probability: baseRisk * riskFactor
        })
      }
      setHistoricalData(mockData)
    } catch (error) {
      console.error("Error fetching historical data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateSelect = date => {
    setSelectedDate(date)
    if (date) {
      fetchHistoricalData(date)
    }
  }

  const getRiskConfig = probability => {
    if (probability >= 0.7)
      return {
        label: "Muy Alto",
        className: "bg-red-100 text-red-700 border border-red-300"
      }
    if (probability >= 0.5)
      return {
        label: "Alto",
        className: "bg-orange-100 text-orange-700 border border-orange-300"
      }
    if (probability >= 0.3)
      return {
        label: "Moderado",
        className: "bg-yellow-100 text-yellow-700 border border-yellow-300"
      }
    return {
      label: "Bajo",
      className: "bg-green-100 text-green-700 border border-green-300"
    }
  }

  const toggleExpanded = date => {
    setExpandedDate(expandedDate === date ? null : date)
  }

  return (
    <div className="min-h-screen animate-fade-in">
       <main className="max-w-7xl mx-auto px-6 py-12 space-y-8 ">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-teal-500 backdrop-blur-sm border border-white/30 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-teal-400/30"></div>
        <div className="relative z-10 p-8 md:p-12 text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Análisis Histórico de Eventos
          </h1>
          <p className="text-white/80 text-lg">
            Consulta datos históricos de los ultimos huracanes y su impacto
            en las condiciones meteorológicas y riesgo de inundación
          </p>
        </div>
      </div>

      {/* Fechas de huracanes */}
      <div className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl p-6 space-y-6">
        <h2 className="flex items-center space-x-3 text-xl font-semibold">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <span>Fechas de Huracanes</span>
        </h2>

        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200">
          <h3 className="text-sm font-semibold mb-4 text-gray-700">
            Fechas de Huracanes Históricos:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {hurricaneDates.map(h => (
              <button
                key={h.name}
                onClick={() => handleDateSelect(h.date)}
                className="relative w-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow hover:shadow-lg transition-all duration-300 py-4 px-3 rounded-xl flex flex-col items-center"
              >
                <span className="font-semibold">{h.name}</span>
                <span className="text-xs text-gray-500">
                  {formatDate(h.date, { day: "2-digit", month: "2-digit", year: "numeric" })}
                </span>
              </button>
            ))}
          </div>

          {selectedDate && (
            <button
              onClick={() => fetchHistoricalData(selectedDate)}
              disabled={loading}
              className="mt-4 w-full flex items-center justify-center px-4 py-3 rounded-lg text-white bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 shadow-md hover:shadow-lg transition"
            >
              <Search className="h-4 w-4 mr-2" />
              {loading ? "Buscando..." : "Analizar"}
            </button>
          )}
        </div>
      </div>

      {/* Resultados */}
      {selectedDate && (
        <div className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl p-6">
          <h2 className="flex items-center space-x-3 text-xl font-semibold mb-6">
            <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <span>
              Análisis desde {formatDate(selectedDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </h2>

          {loading ? (
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl p-6 animate-pulse"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      <div className="h-3 w-32 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : historicalData.length > 0 ? (
            <div className="space-y-6 relative">
              <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500 via-teal-500 to-green-500"></div>
              {historicalData.map((item, index) => {
                const riskConfig = getRiskConfig(item.risk_probability)
                const { features } = item
                const isFirst = index === 0
                const itemDate = new Date(item.date)

                return (
                  <div key={item.date} className="relative mb-8">
                    {/* Timeline node */}
                    <div
                      className={`absolute left-6 w-4 h-4 rounded-full border-4 border-white shadow-lg ${
                        item.risk_probability > 0.5
                          ? "bg-red-500"
                          : item.risk_probability > 0.3
                          ? "bg-orange-500"
                          : "bg-green-500"
                      }`}
                    ></div>

                    {/* Card */}
                    <div className="ml-20 bg-white/90 backdrop-blur-sm rounded-2xl shadow-md p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        {/* Riesgo */}
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <div
                              className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-2 ${
                                item.risk_probability > 0.5
                                  ? "bg-red-500"
                                  : item.risk_probability > 0.3
                                  ? "bg-orange-500"
                                  : "bg-green-500"
                              }`}
                            >
                              <AlertTriangle className="h-7 w-7 text-white" />
                            </div>
                            <div className="font-bold text-xl">
                              {(item.risk_probability * 100).toFixed(0)}%
                            </div>
                            <span
                              className={`px-2 py-0.5 text-xs rounded ${riskConfig.className}`}
                            >
                              {riskConfig.label}
                            </span>
                          </div>

                          <div className="border-l border-gray-200 pl-6">
                            <div className="font-bold text-lg">
                              {formatDate(itemDate, { weekday: "long", day: "2-digit" })}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(itemDate, { month: "long", year: "numeric" })}
                            </div>
                            {isFirst && (
                              <div className="text-xs text-blue-600 font-semibold mt-1">
                                📅 Fecha seleccionada
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Métricas */}
                        <div className="flex-1">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-white/60 rounded-xl">
                              <Thermometer className="w-5 h-5 mx-auto mb-1 text-red-500" />
                              <div className="font-bold text-lg">
                                {features.temp.toFixed(1)}°
                              </div>
                              <div className="text-xs text-gray-500">
                                Temperatura
                              </div>
                            </div>

                            <div className="text-center p-3 bg-white/60 rounded-xl">
                              <Droplets className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                              <div className="font-bold text-lg">
                                {features.humidity.toFixed(0)}%
                              </div>
                              <div className="text-xs text-gray-500">
                                Humedad
                              </div>
                            </div>

                            <div className="text-center p-3 bg-white/60 rounded-xl">
                              <Wind className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                              <div className="font-bold text-lg">
                                {features.windgust?.toFixed(0) || "N/A"}
                              </div>
                              <div className="text-xs text-gray-500">
                                Viento mph
                              </div>
                            </div>

                            <div className="text-center p-3 bg-white/60 rounded-xl">
                              <Droplets className="w-5 h-5 mx-auto mb-1 text-cyan-500" />
                              <div className="font-bold text-lg">
                                {features.precip.toFixed(1)}
                              </div>
                              <div className="text-xs text-gray-500">
                                Precip in
                              </div>
                            </div>
                          </div>

                          {/* Expandir */}
                          <div className="mt-4 text-center">
                            <button
                              onClick={() => toggleExpanded(item.date)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {expandedDate === item.date
                                ? "Ocultar detalles ↑"
                                : "Ver más detalles ↓"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-6 bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200 rounded-xl max-w-md mx-auto">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                <p className="text-gray-600 font-medium">
                  Selecciona una fecha para ver el análisis histórico
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      </main>
    </div>
  )
  
}

export default Huracanes
