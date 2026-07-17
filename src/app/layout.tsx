import type { Metadata } from 'next'
import './globals.css'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { AppShellClient } from './AppShellClient'
import { headers } from 'next/headers'

export const metadata: Metadata = {
  title: 'CRM NEOSOL',
  description: 'Sistema de gestión',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  
  const logoConfig = await prisma.configuracionSistema.findUnique({
    where: { clave: 'logo' }
  })
  const logo = logoConfig ? logoConfig.valor : null

  const isPublicRoute = 
    pathname.startsWith('/visitas-hoy') || 
    pathname.startsWith('/precios-publicos') || 
    pathname.startsWith('/reportes-publicos') ||
    pathname === '/login'

  // If there is no authenticated user session (e.g. /login) OR they are visiting a public landing page, render page full screen
  if (!user || isPublicRoute) {
    return (
      <html lang="es">
        <body>
          <div className="min-h-screen bg-[#0B132B]">
            {children}
          </div>
        </body>
      </html>
    )
  }

  const zonesList = await prisma.zona.findMany({
    orderBy: { nombre: 'asc' }
  })
  const zones = zonesList.map(z => z.nombre)

  return (
    <html lang="es">
      <body>
        <AppShellClient logo={logo} user={user} zones={zones}>
          {children}
        </AppShellClient>
      </body>
    </html>
  )
}

