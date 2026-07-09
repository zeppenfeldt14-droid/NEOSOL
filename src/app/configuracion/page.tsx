import { Settings } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { ConfigPageClient } from './ConfigPageClient'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  const logoConfig = await prisma.configuracionSistema.findUnique({
    where: { clave: 'logo' }
  })
  
  const logo = logoConfig ? logoConfig.valor : null

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <div>
          <h1 className="page-title !mb-0 flex items-center gap-2">
            <Settings className="text-primary" /> Configuración del Sistema
          </h1>
          <p className="page-subtitle mt-1">
            Personaliza el CRM y configura las preferencias generales de tu negocio.
          </p>
        </div>
      </div>

      <ConfigPageClient currentLogo={logo} />
    </div>
  )
}
