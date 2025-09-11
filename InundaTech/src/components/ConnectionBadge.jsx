export default function ConnectionBadge({ conn, error }) {
  const base =
    "inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-sm font-medium";
  if (error) {
    return (
      <span className={`${base} bg-red-100 text-red-800 border-red-300`}>
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Error de datos
      </span>
    );
  }
  if (conn === "connected") {
    return (
      <span className={`${base} bg-green-100 text-green-800 border-green-300`}>
        <span className="w-2 h-2 rounded-full bg-green-500" />
        Conectado a Firebase
      </span>
    );
  }
  if (conn === "connecting") {
    return (
      <span className={`${base} bg-yellow-100 text-yellow-800 border-yellow-300`}>
        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        Conectando…
      </span>
    );
  }
  return (
    <span className={`${base} bg-gray-100 text-gray-800 border-gray-300`}>
      <span className="w-2 h-2 rounded-full bg-gray-500" />
      Desconectado
    </span>
  );
}
