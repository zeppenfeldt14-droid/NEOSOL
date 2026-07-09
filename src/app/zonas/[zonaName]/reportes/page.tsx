import { prisma } from '@/lib/prisma'
import ReportGenerator from './ReportGenerator'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ReportesPage({ params }: { params: Promise<{ zonaName: string }> }) {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  const { zonaName } = await params
  const decodedZona = decodeURIComponent(zonaName)

  // Verify access permissions to this zone
  if (user.nivel === 3 && user.zona !== decodedZona) {
    redirect(`/zonas/${user.zona || 'CABA'}/reportes`)
  } else if (user.nivel === 2) {
    let enabledZones: string[] = []
    try {
      if (user.zonasHabilitadas) {
        enabledZones = JSON.parse(JSON.stringify(user.zonasHabilitadas))
      }
    } catch (e) {}
    if (!enabledZones.includes(decodedZona)) {
      redirect(`/zonas/${enabledZones[0] || 'CABA'}/reportes`)
    }
  }

  const isVendedor = user.nivel === 3
  const userAlias = user.alias

  const whereVisitasFilter = {
    empresa: {
      zona: decodedZona,
      ...(isVendedor ? { vendedorAsignado: userAlias } : {})
    }
  }
  const wherePendientesFilter = {
    empresa: {
      zona: decodedZona,
      ...(isVendedor ? { vendedorAsignado: userAlias } : {})
    }
  }

  const today = new Date()
  const startOfDay = new Date(today.setHours(0,0,0,0))
  
  // Obtener las visitas de hoy para el reporte
  const visitas = await prisma.visita.findMany({
    where: {
      fecha: {
        gte: startOfDay
      },
      ...whereVisitasFilter
    },
    include: {
      empresa: true
    }
  })

  // Obtener acciones pendientes para añadir al reporte
  const pendientes = await prisma.accion.findMany({
    where: { 
      estado: 'pendiente',
      ...wherePendientesFilter
    },
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
