import { useState, useEffect } from 'react';
import { 
  Activity, AlertTriangle, Droplets, TrendingUp, TrendingDown, 
  CheckCircle, MapPin, Clock, Thermometer, Waves, Gauge
} from 'lucide-react';

const mockRiverData = [
  { 
    id: '1', 
    name: 'Río Magdalena', 
    location: 'Barranquilla, Atlántico', 
    currentLevel: 3.2, 
    maxLevel: 5.0, 
    alertLevel: 4.0, 
    trend: 'up', 
    lastUpdate: '2 min ago', 
    status: 'safe',
    temperature: 26.5,
    flowRate: 3200 // m³/s
  }
];

const getStatusColor = (status) => {
  switch (status) {
    case 'safe': return 'bg-green-100 text-green-800';
    case 'warning': return 'bg-yellow-100 text-yellow-800';
    case 'danger': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const getTrendIcon = (trend) => {
  switch (trend) {
    case 'up': return <TrendingUp className="h-5 w-5 text-red-500" />;
    case 'down': return <TrendingDown className="h-5 w-5 text-green-500" />;
    default: return <Activity className="h-5 w-5 text-blue-500" />;
  }
};

const Progress = ({ value }) => (
  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
    <div
      className="bg-blue-600 h-3 transition-all duration-500"
      style={{ width: `${value}%` }}
    />
  </div>
);

const Badge = ({ children, className }) => (
  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${className}`}>
    {children}
  </span>
);

export const Dashboard = () => {
  const [riverData, setRiverData] = useState(mockRiverData);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const interval = setInterval(() => {
      setRiverData(prev => prev.map(river => ({
        ...river,
        currentLevel: Math.max(0.5, Math.min(river.maxLevel,
          river.currentLevel + (Math.random() - 0.5) * 0.2
        )),
        temperature: (river.temperature + (Math.random() - 0.5) * 0.5).toFixed(1),
        flowRate: Math.max(2000, river.flowRate + Math.floor((Math.random() - 0.5) * 50)),
        lastUpdate: Math.floor(Math.random() * 5) + 1 + ' min ago'
      })));
      setLastUpdate(new Date().toLocaleTimeString());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const isSingleCard = riverData.length === 1;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <header className="mb-6 text-center">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">
          Dashboard de Monitoreo
        </h1>
        <p className="text-gray-500 mt-2 text-lg">Última actualización: {lastUpdate}</p>
      </header>

      <div className={`grid gap-6 ${isSingleCard ? 'flex justify-center' : 'grid-cols-1 md:grid-cols-2'}`}>
        {riverData.map((river, i) => (
          <div
            key={river.id}
            className={`bg-white rounded-2xl shadow-xl p-8 animate-scale-in transition-transform duration-500 ${isSingleCard ? 'w-full max-w-2xl' : ''}`}
            style={{animationDelay: `${i * 100}ms`}}
          >
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-3xl font-bold">{river.name}</h3>
                <p className="flex items-center text-gray-600 text-lg mt-1">
                  <MapPin className="h-5 w-5 mr-1" /> {river.location}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {getTrendIcon(river.trend)}
                <Badge className={getStatusColor(river.status)}>
                  {river.status === 'safe' && 'Seguro'}
                  {river.status === 'warning' && 'Advertencia'}
                  {river.status === 'danger' && 'Peligro'}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-lg font-medium">
                  <span>Nivel Actual</span>
                  <span>{river.currentLevel.toFixed(1)}m / {river.maxLevel}m</span>
                </div>
                <Progress value={(river.currentLevel / river.maxLevel) * 100} />
                <p className="text-sm text-gray-500 mt-1">Nivel de Alerta: {river.alertLevel}m</p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-blue-50 rounded-xl p-4">
                  <Thermometer className="mx-auto h-6 w-6 text-blue-500" />
                  <p className="text-lg font-semibold">{river.temperature}°C</p>
                  <p className="text-gray-500 text-sm">Temperatura</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <Waves className="mx-auto h-6 w-6 text-green-500" />
                  <p className="text-lg font-semibold">{river.flowRate} m³/s</p>
                  <p className="text-gray-500 text-sm">Caudal</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4">
                  <Clock className="mx-auto h-6 w-6 text-yellow-500" />
                  <p className="text-lg font-semibold">{river.lastUpdate}</p>
                  <p className="text-gray-500 text-sm">Última medición</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
