import { useState } from "react"
import { Lock, User, Eye, EyeOff, Mail, Phone, UserPlus } from "lucide-react"
import { useNavigate } from "react-router-dom"

export const RegisterForm = () => {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const navigate = useNavigate()

  const handleRegister = e => {
    e.preventDefault()

    if (password !== confirmPassword) {
      alert("Las contraseñas no coinciden")
      return
    }

    if (password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres")
      return
    }

    setIsLoading(true)

    // Simular registro
    setTimeout(() => {
      console.log("Usuario registrado:", {
        name,
        email,
        phone,
        password
      })
      setIsLoading(false)
      navigate("/") // redirige al login después del registro
    }, 1500)
  }

  const handleBackToLogin = () => {
    navigate("/") // ajusta la ruta a tu login
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 p-4 relative">

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float animate-delay-200"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float animate-delay-500"></div>
      </div>

      <div className="w-full max-w-md bg-white/70 backdrop-blur-md rounded-2xl shadow-2xl border p-6 relative z-10 animate-scale-in">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Crear Cuenta</h2>
          <p className="text-gray-600">
            Regístrate para acceder al Sistema de Monitoreo
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 mt-6">
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">
              Nombre Completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                id="name"
                type="text"
                placeholder="Ingresa tu nombre completo"
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="phone" className="text-sm font-medium">
              Número de Teléfono
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repite tu contraseña"
                className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creando cuenta...</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>Crear Cuenta</span>
              </>
            )}
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="text-sm text-blue-600 hover:underline"
            >
              ¿Ya tienes cuenta? Inicia sesión aquí
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
