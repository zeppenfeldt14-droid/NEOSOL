import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Bell, Clock, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AlertasPage() {
  const empresas = await prisma.empresa.findMany({
    include: {
      visitas: {
        orderBy: { fecha: 'desc' },
        take: 1
      },
      acciones: {
        where: { estado: 'pendiente' },
        orderBy: { fechaVencimiento: 'asc' }
      }
    }
  })

  const today = new Date()
  
  // Calculate alerts dynamically based on settings
  const alertasFrecuencia = []
  const alertasSinAccion = []

  for (const emp of empresas) {
    const ultimaVisita = emp.visitas[0]?.fecha
    
    // Alerta de Frecuencia (Si pasaron más días de los configurados)
    if (emp.frecuenciaVisita && ultimaVisita) {
      const diffTime = Math.abs(today.getTime() - ultimaVisita.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (diffDays > emp.frecuenciaVisita) {
        alertasFrecuencia.push({
          empresa: emp,
          diasPasados: diffDays,
          limite: emp.frecuenciaVisita,
          ultimaVisita
        })
      }
    }

    // Alerta si pasaron más de 14 días y no hay próxima acción programada
    if (ultimaVisita && emp.acciones.length === 0 && emp.estado !== 'descartado') {
      const diffTime = Math.abs(today.getTime() - ultimaVisita.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 14) {
        alertasSinAccion.push({
          empresa: emp,
          diasPasados: diffDays
        })
      }
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Centro de Alertas</h1>
          <p className="page-subtitle">Alertas automáticas basadas en frecuencia de visitas y seguimiento.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Alertas de Frecuencia */}
        <div className="glass-panel card border-warning/30">
          <div className="flex items-center gap-2 border-b pb-4 mb-4 border-white/10">
            <Clock className="text-warning" />
            <h3 className="card-title m-0 text-warning">Frecuencia de Visita Superada</h3>
            <span className="badge badge-warning ml-auto">{alertasFrecuencia.length}</span>
          </div>

          <div className="flex flex-col gap-3">
            {alertasFrecuencia.length === 0 && <p className="text-secondary text-sm">Todas las visitas están al día.</p>}
            
            {alertasFrecuencia.map((a, i) => (
              <div key={i} className="p-4 bg-black/20 rounded-lg border border-warning/20">
                <div className="flex justify-between items-start mb-2">
                  <Link href={`/empresas/${a.empresa.id}`} className="font-semibold text-lg hover:text-warning transition-colors">
                    {a.empresa.nombre}
                  </Link>
                  <span className="badge badge-warning">Hace {a.diasPasados} días</span>
                </div>
                <p className="text-sm text-secondary mb-3">
                  Configurado cada {a.limite} días. Última visita: {a.ultimaVisita.toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <Link href={`/empresas/${a.empresa.id}`} className="btn btn-secondary text-xs">
                    Programar Visita
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sin Seguimiento */}
        <div className="glass-panel card border-danger/30 delay-100">
          <div className="flex items-center gap-2 border-b pb-4 mb-4 border-white/10">
            <AlertCircle className="text-danger" />
            <h3 className="card-title m-0 text-danger">Sin Próxima Acción (Enfriándose)</h3>
            <span className="badge badge-danger ml-auto">{alertasSinAccion.length}</span>
          </div>

          <div className="flex flex-col gap-3">
            {alertasSinAccion.length === 0 && <p className="text-secondary text-sm">Todas las empresas tienen acciones programadas.</p>}
            
            {alertasSinAccion.map((a, i) => (
              <div key={i} className="p-4 bg-black/20 rounded-lg border border-danger/20">
                <div className="flex justify-between items-start mb-2">
                  <Link href={`/empresas/${a.empresa.id}`} className="font-semibold text-lg hover:text-danger transition-colors">
                    {a.empresa.nombre}
                  </Link>
                  <span className="badge badge-danger">Abandonado ({a.diasPasados}d)</span>
                </div>
                <p className="text-sm text-secondary mb-3">
                  No hay acciones pendientes programadas para este prospecto.
                </p>
                <div className="flex gap-2">
                  <Link href={`/empresas/${a.empresa.id}`} className="btn btn-secondary text-xs">
                    Crear Acción
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
