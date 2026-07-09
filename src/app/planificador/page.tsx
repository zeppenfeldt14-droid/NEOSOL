import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Map as MapIcon, Clock, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react'
import { CompleteActionButton } from '../empresas/[id]/ActionButtons'
import IntelligentPlanner from './IntelligentPlanner'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

async function crearRutaAction(empresaIds: number[], targetDateStr?: string) {
  'use server'
  let date = new Date()
  if (targetDateStr) {
    date = new Date(targetDateStr + 'T03:00:00.000Z') // Force Argentina midnight UTC-3
  } else {
    date.setHours(0, 0, 0, 0)
  }

  // Create a pending action for each company
  for (const id of empresaIds) {
    await prisma.accion.create({
      data: {
        empresaId: id,
        tipo: 'visita_programada',
        descripcion: 'Visita de ruta inteligente',
        prioridad: 'alta',
        fechaVencimiento: date
      }
    })
  }

  revalidatePath('/planificador')
}

async function eliminarAccionAction(accionId: number) {
  'use server'
  await prisma.accion.delete({
    where: { id: accionId }
  })
  revalidatePath('/planificador')
  revalidatePath('/')
}

async function reagendarAccionAction(accionId: number, targetDateStr: string) {
  'use server'
  const date = new Date(targetDateStr + 'T03:00:00.000Z') // Force Argentina midnight UTC-3
  await prisma.accion.update({
    where: { id: accionId },
    data: { fechaVencimiento: date }
  })
  revalidatePath('/planificador')
  revalidatePath('/')
}

async function reordenarRutaAction(accionesIds: number[]) {
  'use server'
  // Use a transaction to update all orders based on the index + 1
  for (let i = 0; i < accionesIds.length; i++) {
    await prisma.accion.update({
      where: { id: accionesIds[i] },
      data: { orden: i + 1 }
    })
  }
  revalidatePath('/planificador')
  revalidatePath('/')
}

export default async function PlanificadorPage(props: { searchParams: Promise<{ vista?: string }> }) {
  const searchParams = await props.searchParams
  const vista = searchParams.vista || 'hoy' // 'hoy', 'semana', 'mes'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Acciones vencidas
  const vencidas = await prisma.accion.findMany({
    where: {
      estado: 'pendiente',
      fechaVencimiento: {
        lt: today
      }
    },
    include: { empresa: true },
    orderBy: { fechaVencimiento: 'asc' }
  })

  // Acciones para hoy
  const paraHoy = await prisma.accion.findMany({
    where: {
      estado: 'pendiente',
      fechaVencimiento: {
        gte: today,
        lt: tomorrow
      }
    },
    include: { empresa: true },
    orderBy: [
      { orden: 'asc' },
      { id: 'asc' }
    ]
  })

  // Acciones próximas (7 días)
  const proximaSemana = new Date(today)
  proximaSemana.setDate(proximaSemana.getDate() + 7)
  const proximas = await prisma.accion.findMany({
    where: {
      estado: 'pendiente',
      fechaVencimiento: {
        gte: tomorrow,
        lt: proximaSemana
      }
    },
    include: { empresa: true },
    orderBy: { fechaVencimiento: 'asc' }
  })

  // Algoritmo Inteligente de Sugerencias
  const empresasAll = await prisma.empresa.findMany({
    include: {
      visitas: {
        orderBy: { fecha: 'desc' },
        take: 1
      }
    }
  })

  const currentMs = new Date().getTime()
  const sugerencias = []
  const zonasSet = new Set<string>()

  for (const emp of empresasAll) {
    if (emp.zona) zonasSet.add(emp.zona.trim().toUpperCase())

    const ultimaVisita = emp.visitas[0]?.fecha
    let diasDesde = null
    
    if (ultimaVisita) {
      diasDesde = Math.floor((currentMs - ultimaVisita.getTime()) / (1000 * 60 * 60 * 24))
    }

    if (emp.cicloVentaDias && emp.estado === 'activo') {
      if (diasDesde !== null && diasDesde >= emp.cicloVentaDias) {
        sugerencias.push({
          id: emp.id,
          nombre: emp.nombre,
          zona: emp.zona ? emp.zona.trim().toUpperCase() : null,
          barrio: emp.barrio,
          direccion: emp.direccion,
          telefono: emp.telefono,
          estado: emp.estado,
          cicloVentaDias: emp.cicloVentaDias,
          diasDesdeUltimaVisita: diasDesde,
          motivo: `Ciclo de venta cumplido (${emp.cicloVentaDias} días). Última visita hace ${diasDesde} días.`
        })
      }
    } else if (emp.estado === 'prospecto') {
      // Mostrar a todos los prospectos como sugirió el usuario
      // Se resaltarán primero los de más tiempo en el sorting
      let motivo = ''
      if (diasDesde === null) {
        motivo = 'Prospecto nuevo sin visitas'
      } else if (diasDesde > 14) {
        motivo = `Retomar contacto (hace ${diasDesde} días)`
      } else {
        motivo = `Visita reciente (hace ${diasDesde} días)`
      }

      sugerencias.push({
        id: emp.id,
        nombre: emp.nombre,
        zona: emp.zona ? emp.zona.trim().toUpperCase() : null,
        barrio: emp.barrio,
        direccion: emp.direccion,
        telefono: emp.telefono,
        estado: emp.estado,
        cicloVentaDias: null,
        diasDesdeUltimaVisita: diasDesde,
        motivo: motivo
      })
    }
  }

  // Ordenar sugerencias:
  // 1. diasDesde === null (primero, son los de mayor prioridad por no tener visitas)
  // 2. diasDesde en orden descendente (los de hace más tiempo primero)
  sugerencias.sort((a, b) => {
    if (a.diasDesdeUltimaVisita === null && b.diasDesdeUltimaVisita !== null) return -1
    if (b.diasDesdeUltimaVisita === null && a.diasDesdeUltimaVisita !== null) return 1
    if (a.diasDesdeUltimaVisita === null && b.diasDesdeUltimaVisita === null) return 0
    
    // Si ambos tienen días, el mayor va primero
    return b.diasDesdeUltimaVisita! - a.diasDesdeUltimaVisita!
  })

  const zonas = Array.from(zonasSet).sort()

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
  const accionesMes = vista === 'mes' ? await prisma.accion.findMany({
    where: {
      fechaVencimiento: { gte: startOfMonth, lte: endOfMonth }
    },
    include: { empresa: true },
    orderBy: { fechaVencimiento: 'asc' }
  }) : []

  return (
    <div className="animate-fade-in pb-12">
      <div className="page-header">
        <div>
          <h1 className="page-title">Planificador de Rutas</h1>
          <p className="page-subtitle">
            {vista === 'hoy' ? `Organiza tus visitas para hoy: ${today.toLocaleDateString()}` : 
             vista === 'semana' ? 'Programa las visitas para la próxima semana.' :
             `Resumen mensual de visitas (${startOfMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })})`}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <Link href="?vista=hoy" className={`btn ${vista === 'hoy' ? 'btn-primary' : 'btn-secondary'}`}>
          Visitas del Día
        </Link>
        <Link href="?vista=semana" className={`btn ${vista === 'semana' ? 'btn-primary' : 'btn-secondary'}`}>
          Planificación Próxima Semana
        </Link>
        <Link href="?vista=mes" className={`btn ${vista === 'mes' ? 'btn-primary' : 'btn-secondary'}`}>
          Resumen del Mes
        </Link>
      </div>

      {vista !== 'mes' && (
        <IntelligentPlanner 
          sugerencias={sugerencias} 
          zonas={zonas} 
          crearRutaAction={crearRutaAction}
          accionesHoy={paraHoy}
          accionesFuturas={proximas}
          eliminarAccionAction={eliminarAccionAction}
          reagendarAccionAction={reagendarAccionAction}
          reordenarRutaAction={reordenarRutaAction}
          vista={vista}
        />
      )}

      {vista === 'mes' && (
        <div className="glass-panel card mt-8">
          <h3 className="card-title">Acciones del Mes</h3>
          <div className="table-container mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha Vencimiento</th>
                  <th>Empresa</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {accionesMes.map(accion => (
                  <tr key={accion.id}>
                    <td>{accion.fechaVencimiento?.toLocaleDateString()}</td>
                    <td style={{ fontWeight: 500 }}>
                      <Link href={`/empresas/${accion.empresaId}`}>{accion.empresa.nombre}</Link>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{accion.tipo.replace('_', ' ')}</td>
                    <td>
                      <span className={`badge ${accion.estado === 'completada' ? 'badge-success' : 'badge-warning'}`}>
                        {accion.estado}
                      </span>
                    </td>
                  </tr>
                ))}
                {accionesMes.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No hay acciones en este mes.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {vista !== 'mes' && (
        <div className="glass-panel card mt-8">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Directorio de Empresas</h3>
          </div>
          <p className="card-subtitle" style={{ marginBottom: '1.5rem' }}>Lista completa para consulta y agendamiento manual.</p>
          
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Zona</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {empresasAll.map(emp => (
                  <tr key={emp.id}>
                    <td style={{ fontWeight: 500 }}>{emp.nombre}</td>
                    <td>{emp.zona || '-'}</td>
                    <td>
                      <span className={`badge ${emp.estado === 'prospecto' ? 'badge-warning' : emp.estado === 'activo' ? 'badge-success' : 'badge-neutral'}`}>
                        {emp.estado}
                      </span>
                    </td>
                    <td>
                      <Link href={`/empresas/${emp.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                        Ver Ficha
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
