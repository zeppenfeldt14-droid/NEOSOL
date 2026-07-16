import { prisma } from '@/lib/prisma'
import VisitasHoyCabaClient from './VisitasHoyCabaClient'

export const dynamic = 'force-dynamic'

export default async function VisitasHoyCabaPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Consultar visitas pendientes programadas para hoy en la zona de CABA
  const visitas = await prisma.accion.findMany({
    where: {
      estado: 'pendiente',
      tipo: 'visita_programada',
      fechaVencimiento: {
        gte: today,
        lt: tomorrow
      },
      empresa: {
        zona: 'CABA'
      }
    },
    include: {
      empresa: {
        select: {
          id: true,
          nombre: true,
          direccion: true,
          barrio: true,
          telefono: true,
          estado: true
        }
      }
    },
    orderBy: [
      { orden: 'asc' },
      { id: 'asc' }
    ]
  })

  // Adaptar tipados de Prisma a Props de Client Component
  const initialVisitas = visitas.map(v => ({
    id: v.id,
    empresaId: v.empresaId,
    descripcion: v.descripcion || '',
    orden: v.orden,
    empresa: {
      id: v.empresa.id,
      nombre: v.empresa.nombre,
      direccion: v.empresa.direccion,
      barrio: v.empresa.barrio,
      telefono: v.empresa.telefono,
      estado: v.empresa.estado
    }
  }))

  return (
    <VisitasHoyCabaClient initialVisitas={initialVisitas} />
  )
}
