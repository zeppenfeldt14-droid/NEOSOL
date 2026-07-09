import { prisma } from '@/lib/prisma'
import ReportGenerator from './ReportGenerator'

export const dynamic = 'force-dynamic'

export default async function ReportesPage() {
  const today = new Date()
  const startOfDay = new Date(today.setHours(0,0,0,0))
  
  // Obtener las visitas de hoy para el reporte
  const visitas = await prisma.visita.findMany({
    where: {
      fecha: {
        gte: startOfDay
      }
    },
    include: {
      empresa: true
    }
  })

  // Obtener acciones pendientes para añadir al reporte
  const pendientes = await prisma.accion.findMany({
    where: { estado: 'pendiente' },
    include: { empresa: true },
    orderBy: { fechaVencimiento: 'asc' }
  })

  // Map to a serializable format for the Client Component
  const reporteData = {
    fecha: new Date().toLocaleDateString('es-AR'),
    visitas: visitas.map(v => ({
      id: v.id,
      empresaNombre: v.empresa.nombre,
      direccion: v.empresa.direccion,
      barrio: v.empresa.barrio,
      resultado: v.resultado,
      contacto: v.contacto,
      notas: v.notas,
      proximaAccion: v.proximaAccion
    })),
    pendientes: pendientes.map(p => ({
      id: p.id,
      empresaNombre: p.empresa.nombre,
      descripcion: p.descripcion,
      vencimiento: p.fechaVencimiento ? new Date(p.fechaVencimiento).toLocaleDateString('es-AR') : 'Sin fecha'
    }))
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Generación de Reportes</h1>
          <p className="page-subtitle">Crea el reporte PDF modelo y envíalo por correo a gerencia.</p>
        </div>
      </div>

      <ReportGenerator data={reporteData} defaultEmail="lares.ernesto@galletitasneosol.com.ar" />
    </div>
  )
}
