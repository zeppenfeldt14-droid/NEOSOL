import { prisma } from '@/lib/prisma'
import ReportesPublicosClient from './ReportesPublicosClient'

export const dynamic = 'force-dynamic'

export default async function ReportesPublicosPage({
  params
}: {
  params: Promise<{ zonaName: string }>
}) {
  const { zonaName } = await params
  const decodedZona = decodeURIComponent(zonaName)

  // Fetch all visits in this zone from DB (ordered newest first)
  const visitasDB = await prisma.visita.findMany({
    where: {
      empresa: { zona: decodedZona }
    },
    include: { empresa: true },
    orderBy: { fecha: 'desc' }
  })

  // Group visits by day (formatted in local time YYYY-MM-DD)
  const gruposPorDia: Record<string, typeof visitasDB> = {}
  visitasDB.forEach(v => {
    // Argentina is UTC-3. Subtract 3 hours from UTC time to group properly.
    const arDate = new Date(v.fecha.getTime() - 3 * 60 * 60 * 1000)
    const dayStr = arDate.toISOString().split('T')[0]
    if (!gruposPorDia[dayStr]) gruposPorDia[dayStr] = []
    gruposPorDia[dayStr].push(v)
  })

  // Fetch actions in this zone
  const pendientesDB = await prisma.accion.findMany({
    where: {
      empresa: { zona: decodedZona }
    },
    include: { empresa: true }
  })

  // Group actions by creation date (YYYY-MM-DD)
  const pendientesPorDia: Record<string, typeof pendientesDB> = {}
  pendientesDB.forEach(p => {
    const arDate = new Date(p.creadoEn.getTime() - 3 * 60 * 60 * 1000)
    const dayStr = arDate.toISOString().split('T')[0]
    if (!pendientesPorDia[dayStr]) pendientesPorDia[dayStr] = []
    pendientesPorDia[dayStr].push(p)
  })

  // Map to structured daily reports list
  const reportes = Object.keys(gruposPorDia).map(dayStr => {
    const dayParts = dayStr.split('-')
    const formattedDate = `${dayParts[2]}-${dayParts[1]}-${dayParts[0]}` // DD-MM-YYYY
    const visitasDelDia = gruposPorDia[dayStr]
    const pendientesDelDia = pendientesPorDia[dayStr] || []
    
    return {
      id: dayStr,
      fecha: formattedDate,
      vendedorAlias: visitasDelDia[0]?.usuarioAlias || 'Ernesto Lares',
      visitas: visitasDelDia.map(v => ({
        id: v.id,
        empresaNombre: v.empresa.nombre,
        direccion: v.empresa.direccion,
        barrio: v.empresa.barrio,
        resultado: v.resultado,
        contacto: v.contacto,
        notas: v.notas,
        proximaAccion: v.proximaAccion,
        notes: v.notas // Fallback
      })),
      pendientes: pendientesDelDia.map(p => ({
        id: p.id,
        empresaNombre: p.empresa.nombre,
        descripcion: p.descripcion,
        vencimiento: p.fechaVencimiento ? `${p.fechaVencimiento.getDate().toString().padStart(2, '0')}-${(p.fechaVencimiento.getMonth()+1).toString().padStart(2, '0')}-${p.fechaVencimiento.getFullYear()}` : 'Sin fecha',
        completada: p.estado !== 'pendiente'
      })),
      date: new Date(dayStr).toISOString()
    }
  })

  // Sort descending by date
  reportes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <ReportesPublicosClient 
      reportes={reportes} 
      zonaName={decodedZona} 
    />
  )
}
