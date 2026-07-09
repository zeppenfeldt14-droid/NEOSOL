'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [alias, setAlias] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!alias || !password) {
      setError('Por favor completa todos los campos.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias, password })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Credenciales incorrectas')
        setIsLoading(false)
        return
      }

      if (data.success && data.user) {
        // Store user metadata in localStorage for Client-side usage (Sidebar, Header, Alerts Engine)
        localStorage.setItem('staff_user', data.user.nombre)
        localStorage.setItem('staff_user_id', data.user.id.toString())
        localStorage.setItem('staff_user_email', data.user.email)
        localStorage.setItem('staff_user_alias', data.user.alias)
        localStorage.setItem('staff_user_role', data.user.rol)
        localStorage.setItem('user_level', data.user.nivel.toString())
        localStorage.setItem('user_modules', JSON.stringify(data.user.modulos || {}))
        localStorage.setItem('user_status_limits', JSON.stringify(data.user.limitesEstado || {}))
        localStorage.setItem('staff_auth', 'true')

        // Redirect to homepage using full reload to refresh all Server Components with new session cookie
        window.location.href = '/'
      } else {
        setError('Error al procesar el inicio de sesión.')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Login Error:', err)
      setError('Error de conexión con el servidor.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B132B] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#ea580c]/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />

      <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-[420px] shadow-2xl relative z-10 text-center border border-white/5">
        <div className="w-20 h-20 bg-[#ea580c] rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-orange-500/40">
          <Lock size={36} className="text-white" />
        </div>

        <h2 className="text-3xl font-black italic tracking-tight text-[#0B132B] mb-2 uppercase">NEOSOL STAFF</h2>
        <p className="text-xs text-gray-500 font-bold mb-8 uppercase tracking-widest">Reporte de Visitas</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 italic animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div className="relative">
            <input
              type="text"
              placeholder="Alias de Usuario"
              value={alias}
              onChange={(e) => { setAlias(e.target.value); setError(''); }}
              className="w-full bg-[#F8F9FB] text-[#0B132B] font-bold text-sm px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#ea580c]/50 transition-all border-none"
              autoComplete="username"
              required
            />
          </div>

          <div className="relative">
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="w-full bg-[#F8F9FB] text-[#0B132B] font-bold text-sm px-5 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#ea580c]/50 transition-all border-none"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full ${isLoading ? 'bg-orange-400 cursor-not-allowed' : 'bg-[#0B132B] hover:bg-orange-600'} text-white py-4 rounded-2xl font-black tracking-widest text-sm transition-all shadow-lg shadow-blue-500/20 mt-2 flex items-center justify-center gap-2 uppercase`}
          >
            {isLoading ? 'VERIFICANDO...' : 'ENTRAR AL SISTEMA'}
          </button>
        </form>
      </div>
    </div>
  )
}
