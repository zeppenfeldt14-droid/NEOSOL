import type { Metadata } from 'next'
import './globals.css'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { AppShellClient } from './AppShellClient'

export const metadata: Metadata = {
  title: 'CRM Neosol Visitas',
  description: 'Sistema de gestión de visitas y empresas',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  
  const logoConfig = await prisma.configuracionSistema.findUnique({
    where: { clave: 'logo' }
  })
  const logo = logoConfig ? logoConfig.valor : null

  // If there is no authenticated user session (e.g. /login), render page full screen
  if (!user) {
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

  return (
    <html lang="es">
      <body>
        <AppShellClient logo={logo} user={user}>
          {children}
        </AppShellClient>
      </body>
    </html>
  )
}

