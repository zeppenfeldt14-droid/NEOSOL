import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CobranzasPageClient } from './CobranzasPageClient'
import { prisma } from '@/lib/prisma'

export default async function CobranzasPage() {
  const session = await getSessionUser()
  if (!session) redirect('/login')

  const allZones = await prisma.zona.findMany({ orderBy: { nombre: 'asc' } })
  const allZoneNames = allZones.map(z => z.nombre)

  let availableZones: string[] = []
  if (session.nivel === 1) {
    availableZones = allZoneNames
  } else if (session.nivel === 2) {
    const habilitadas = Array.isArray(session.zonasHabilitadas)
      ? session.zonasHabilitadas
      : JSON.parse((session.zonasHabilitadas as unknown as string) || '[]')
    availableZones = allZoneNames.filter(z => habilitadas.includes(z))
  } else {
    availableZones = [session.zona || 'Sin Zona']
  }

  return (
    <CobranzasPageClient
      userNivel={session.nivel}
      userAlias={session.alias}
      userZona={session.zona}
      availableZones={availableZones}
    />
  )
}
