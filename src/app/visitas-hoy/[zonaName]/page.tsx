import { prisma } from '@/lib/prisma'
import VisitasHoyClient from './VisitasHoyClient'

export const dynamic = 'force-dynamic'

export default async function VisitasHoyPage({ params }: { params: Promise<{ zonaName: string }> }) {
  const { zonaName } = await params
  const decodedZona = decodeURIComponent(zonaName)

  const today = new Date()
  today.setHours(0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Incluye TODOS los tipos de accion: visita, whatsapp, correo, llamada
  const acciones = await prisma.accion.findMany({
    where: {
      estado: 'pendiente',
      fechaVencimiento: { gte: today, lt: tomorrow },
      empresa: { zona: decodedZona }
    },
    include: {
      empresa: {
        select: { id: true, nombre: true, direccion: true, barrio: true, telefono: true, email: true, estado: true }
      }
    },
    orderBy: [
      { orden: 'asc' },
      { id: 'asc' }
    ]
  })

  const initialAcciones = acciones.map(a => ({
    id: a.id,
    empresaId: a.empresaId,
    tipo: a.tipo,
    descripcion: a.descripcion || '',
    orden: a.orden,
    empresa: {
      id: a.empresa.id,
      nombre: a.empresa.nombre,
      direccion: a.empresa.direccion,
      barrio: a.empresa.barrio,
      telefono: a.empresa.telefono,
      email: a.empresa.email ?? null,
      estado: a.empresa.estado
    }
  }))

  return <VisitasHoyClient initialAcciones={initialAcciones} zonaName={decodedZona} />
}
