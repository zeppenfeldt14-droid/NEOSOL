'use client'

import { useEffect, useState } from 'react'
import { LayoutDashboard, Users, Map as MapIcon, Bell, FileText, Settings, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface UserSession {
  id: number
  nombre: string
  alias: string
  email: string
  nivel: number
  rol: string
  modulos: Record<string, boolean>
}

interface Props {
  children: React.ReactNode
  logo: string | null
  user: UserSession
}

export function AppShellClient({ children, logo, user }: Props) {
  const pathname = usePathname()
  const [modules, setModules] = useState<Record<string, boolean>>(user.modulos || {})
  const [userName, setUserName] = useState(user.nombre)
  const [userRol, setUserRol] = useState(user.rol)

  // Sync with localStorage if available (to get updated name/photo changes if any)
  useEffect(() => {
    const localModules = localStorage.getItem('user_modules')
    const localName = localStorage.getItem('staff_user')
    const localRol = localStorage.getItem('staff_user_role')

    if (localModules) {
      try {
        setModules(JSON.parse(localModules))
      } catch (e) {}
    }
    if (localName) setUserName(localName)
    if (localRol) setUserRol(localRol)
  }, [])

  const handleLogout = async () => {
    if (confirm('¿Estás seguro de que deseas salir del sistema?')) {
      try {
        const res = await fetch('/api/auth/logout', { method: 'POST' })
        if (res.ok) {
          localStorage.clear()
          window.location.href = '/login'
        } else {
          alert('Error al cerrar sesión.')
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  // Initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  // Active path checking
  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true
    if (path !== '/' && pathname.startsWith(path)) return true
    return false
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header" style={{ padding: logo ? '1.5rem 1rem' : '1.5rem' }}>
          {logo ? (
            <img src={logo} alt="Logo" style={{ maxHeight: '55px', maxWidth: '100%', objectFit: 'contain', margin: '0 auto' }} />
          ) : (
            <div className="sidebar-logo">NEOSOL</div>
          )}
        </div>
        
        <nav className="sidebar-nav">
          {modules.visitas !== false && (
            <Link href="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
              <LayoutDashboard className="nav-icon" />
              <span>Gestión de Visitas</span>
            </Link>
          )}
          
          {modules.empresas !== false && (
            <Link href="/empresas" className={`nav-item ${isActive('/empresas') ? 'active' : ''}`}>
              <Users className="nav-icon" />
              <span>Empresas</span>
            </Link>
          )}
          
          {modules.planificador !== false && (
            <Link href="/planificador" className={`nav-item ${isActive('/planificador') ? 'active' : ''}`}>
              <MapIcon className="nav-icon" />
              <span>Planificador Diario</span>
            </Link>
          )}
          
          {modules.alertas !== false && (
            <Link href="/alertas" className={`nav-item ${isActive('/alertas') ? 'active' : ''}`}>
              <Bell className="nav-icon" />
              <span>Alertas y Tareas</span>
            </Link>
          )}

          {modules.reportes !== false && (
            <Link href="/reportes" className={`nav-item ${isActive('/reportes') ? 'active' : ''}`}>
              <FileText className="nav-icon" />
              <span>Reportes (PDF)</span>
            </Link>
          )}
        </nav>

        <div className="sidebar-nav" style={{ flex: 'none', borderTop: '1px solid var(--border-light)' }}>
          {modules.configuracion !== false && (
            <Link href="/configuracion" className={`nav-item ${isActive('/configuracion') ? 'active' : ''}`}>
              <Settings className="nav-icon" />
              <span>Configuración</span>
            </Link>
          )}
          <button onClick={handleLogout} className="nav-item" style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}>
            <LogOut className="nav-icon" style={{ color: 'var(--danger)' }} />
            <span style={{ color: 'var(--danger)' }}>Salir</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="flex items-center gap-4">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 500 }} className="text-white font-bold">NEOSOL CRM</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right">
              <span className="text-xs font-black text-white leading-tight">{userName}</span>
              <span className="text-[10px] text-secondary font-bold leading-none mt-1">{userRol}</span>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '12px', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'black', fontSize: '0.85rem' }} className="text-white border border-white/10 shadow-md uppercase">
              {getInitials(userName)}
            </div>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  )
}
