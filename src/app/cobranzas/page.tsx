import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { CobranzasPageClient } from './CobranzasPageClient'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      id: number; nombre: string; alias: string; nivel: number; zona: string | null; zonasHabilitadas: string[]
    }
  } catch { return null }
}

export default async function CobranzasPage() {
  const session = await getSession()
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
