import type { Metadata } from 'next'
import './globals.css'
import { LayoutDashboard, Users, Map as MapIcon, Bell, FileText, Settings, LogOut } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'CRM Neosol Visitas',
  description: 'Sistema de gestión de visitas y empresas',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const logoConfig = await prisma.configuracionSistema.findUnique({
    where: { clave: 'logo' }
  })
  const logo = logoConfig ? logoConfig.valor : null

  return (
    <html lang="es">
      <body>
        <div className="app-container">
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-header" style={{ padding: logo ? '1rem' : '1.5rem' }}>
              {logo ? (
                <img src={logo} alt="Logo" style={{ maxHeight: '50px', maxWidth: '100%', objectFit: 'contain', margin: '0 auto' }} />
              ) : (
                <div className="sidebar-logo">NEOSOL</div>
              )}
            </div>
            
            <nav className="sidebar-nav">
              <Link href="/" className="nav-item">
                <LayoutDashboard className="nav-icon" />
                <span>Gestión de Visitas</span>
              </Link>
              
              <Link href="/empresas" className="nav-item">
                <Users className="nav-icon" />
                <span>Empresas</span>
              </Link>
              
              <Link href="/planificador" className="nav-item">
                <MapIcon className="nav-icon" />
                <span>Planificador Diario</span>
              </Link>
              
              <Link href="/alertas" className="nav-item">
                <Bell className="nav-icon" />
                <span>Alertas y Tareas</span>
              </Link>

              <Link href="/reportes" className="nav-item">
                <FileText className="nav-icon" />
                <span>Reportes (PDF)</span>
              </Link>
            </nav>

            <div className="sidebar-nav" style={{ flex: 'none', borderTop: '1px solid var(--border-light)' }}>
              <Link href="/configuracion" className="nav-item">
                <Settings className="nav-icon" />
                <span>Configuración</span>
              </Link>
              <button className="nav-item" style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}>
                <LogOut className="nav-icon" style={{ color: 'var(--danger)' }} />
                <span style={{ color: 'var(--danger)' }}>Salir</span>
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="main-content">
            <header className="topbar">
              <div className="flex items-center gap-4">
                <h2 style={{ fontSize: '1.25rem', fontWeight: 500 }}>Sistema de Visitas en Terreno</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="badge badge-info">Vendedor: Ernesto Lares</div>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  EL
                </div>
              </div>
            </header>

            <div className="page-content">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
