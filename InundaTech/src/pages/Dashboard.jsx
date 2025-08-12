import { useState, useEffect } from 'react';
import { 
  Activity, AlertTriangle, Droplets, TrendingUp, TrendingDown, 
  CheckCircle, MapPin, Clock, Bell, User 
} from 'lucide-react';

const mockRiverData = [
  { id: '1', name: 'Río Magdalena', location: 'Barranquilla, Atlántico', currentLevel: 3.2, maxLevel: 5.0, alertLevel: 4.0, trend: 'up', lastUpdate: '2 min ago', status: 'safe' },
  { id: '2', name: 'Quebrada La Vieja', location: 'Medellín, Antioquia', currentLevel: 4.5, maxLevel: 5.0, alertLevel: 4.0, trend: 'up', lastUpdate: '1 min ago', status: 'danger' },
  { id: '3', name: 'Río Cauca', location: 'Cali, Valle del Cauca', currentLevel: 2.8, maxLevel: 5.0, alertLevel: 4.0, trend: 'down', lastUpdate: '3 min ago', status: 'safe' },
  { id: '4', name: 'Río Bogotá', location: 'Bogotá, Cundinamarca', currentLevel: 3.8, maxLevel: 5.0, alertLevel: 4.0, trend: 'stable', lastUpdate: '1 min ago', status: 'warning' }
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
    case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
    case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />;
    default: return <Activity className="h-4 w-4 text-blue-500" />;
  }
};

const Progress = ({ value }) => (
  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
    <div
      className="bg-blue-600 h-2"
      style={{ width: `${value}%` }}
    />
  </div>
);

const Badge = ({ children, className }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
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
        lastUpdate: Math.floor(Math.random() * 5) + 1 + ' min ago'
      })));
      setLastUpdate(new Date().toLocaleTimeString());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const safeRivers = riverData.filter(r => r.status === 'safe').length;
  const warningRivers = riverData.filter(r => r.status === 'warning').length;
  const dangerRivers = riverData.filter(r => r.status === 'danger').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
     
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">
          Dashboard de Monitoreo
        </h1>
        <p className="text-gray-500 mt-1">Última actualización: {lastUpdate}</p>
      </header>

      {/* Status summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[{
          title: 'Total Puntos',
          icon: <Droplets className="h-6 w-6 text-blue-500" />,
          value: riverData.length,
          description: 'monitoreando activamente',
          bgColor: 'bg-white'
        }, {
          title: 'Nivel Seguro',
          icon: <CheckCircle className="h-6 w-6 text-green-500" />,
          value: safeRivers,
          description: 'puntos en nivel seguro',
          bgColor: 'bg-green-50'
        }, {
          title: 'Advertencias',
          icon: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
          value: warningRivers,
          description: 'puntos en advertencia',
          bgColor: 'bg-yellow-50'
        }, {
          title: 'Peligro',
          icon: <AlertTriangle className="h-6 w-6 text-red-500" />,
          value: dangerRivers,
          description: 'puntos en peligro',
          bgColor: 'bg-red-50'
        }].map(({title, icon, value, description, bgColor}, i) => (
          <div
            key={title}
            className={`${bgColor} rounded-xl shadow-lg p-4 flex flex-col justify-between animate-scale-in`}
            style={{animationDelay: `${i * 100}ms`}}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">{title}</h2>
              {icon}
            </div>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
        ))}
      </div>

      {/* River cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {riverData.map((river, i) => (
          <div
            key={river.id}
            className="bg-white rounded-xl shadow-lg p-5 animate-scale-in"
            style={{animationDelay: `${i * 100}ms`}}
          >
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-xl font-semibold">{river.name}</h3>
                <p className="flex items-center text-gray-600 text-sm mt-1">
                  <MapPin className="h-4 w-4 mr-1" /> {river.location}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {getTrendIcon(river.trend)}
                <Badge className={getStatusColor(river.status)}>
                  {river.status === 'safe' && 'Seguro'}
                  {river.status === 'warning' && 'Advertencia'}
                  {river.status === 'danger' && 'Peligro'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Nivel Actual</span>
                <span className="font-medium">
                  {river.currentLevel.toFixed(1)}m / {river.maxLevel}m
                </span>
              </div>
              <Progress value={(river.currentLevel / river.maxLevel) * 100} />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Nivel de Alerta: {river.alertLevel}m</span>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{river.lastUpdate}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
