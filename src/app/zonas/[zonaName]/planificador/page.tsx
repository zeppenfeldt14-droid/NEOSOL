import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Map as MapIcon, Clock, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react'
import { CompleteActionButton } from '../empresas/[id]/ActionButtons'
import IntelligentPlanner from './IntelligentPlanner'
import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/date'
import { marcarVisitadaAction, gestionarAccionNoVisitaAction, cambiarTipoAccionAction } from './actions'

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

  let zona = 'CABA'
  if (empresaIds.length > 0) {
    const firstEmp = await prisma.empresa.findUnique({
      where: { id: empresaIds[0] },
      select: { zona: true }
    })
    zona = firstEmp?.zona || 'CABA'
  }

  revalidatePath(`/zonas/${zona}/planificador`)
  revalidatePath(`/zonas/${zona}`)
}

async function eliminarAccionAction(accionId: number) {
  'use server'
  const accion = await prisma.accion.findUnique({
    where: { id: accionId },
    include: { empresa: { select: { zona: true } } }
  })
  const zona = accion?.empresa?.zona || 'CABA'

  await prisma.accion.delete({
    where: { id: accionId }
  })
  revalidatePath(`/zonas/${zona}/planificador`)
  revalidatePath(`/zonas/${zona}`)
}

async function reagendarAccionAction(accionId: number, targetDateStr: string) {
  'use server'
  const date = new Date(targetDateStr + 'T03:00:00.000Z') // Force Argentina midnight UTC-3
  const accion = await prisma.accion.findUnique({
    where: { id: accionId },
    include: { empresa: { select: { zona: true } } }
  })
  const zona = accion?.empresa?.zona || 'CABA'

  await prisma.accion.update({
    where: { id: accionId },
    data: { fechaVencimiento: date }
  })
  revalidatePath(`/zonas/${zona}/planificador`)
  revalidatePath(`/zonas/${zona}`)
}

async function reordenarRutaAction(accionesIds: number[]) {
  'use server'
  for (let i = 0; i < accionesIds.length; i++) {
    await prisma.accion.update({
      where: { id: accionesIds[i] },
      data: { orden: i + 1 }
    })
  }

  let zona = 'CABA'
  if (accionesIds.length > 0) {
    const action = await prisma.accion.findUnique({
      where: { id: accionesIds[0] },
      include: { empresa: { select: { zona: true } } }
    })
    zona = action?.empresa?.zona || 'CABA'
  }

  revalidatePath(`/zonas/${zona}/planificador`)
  revalidatePath(`/zonas/${zona}`)
}

export default async function PlanificadorPage(props: {
  params: Promise<{ zonaName: string }>
  searchParams: Promise<{ vista?: string }>
}) {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  const { zonaName } = await props.params
  const decodedZona = decodeURIComponent(zonaName)

  // Verify access permissions to this zone
  if (user.nivel === 3 && user.zona !== decodedZona) {
    redirect(`/zonas/${user.zona || 'CABA'}/planificador`)
  } else if (user.nivel === 2) {
    let enabledZones: string[] = []
    try {
      if (user.zonasHabilitadas) {
        enabledZones = JSON.parse(JSON.stringify(user.zonasHabilitadas))
      }
    } catch (e) {}
    if (!enabledZones.includes(decodedZona)) {
      redirect(`/zonas/${enabledZones[0] || 'CABA'}/planificador`)
    }
  }

  const isVendedor = user.nivel === 3
  const userAlias = user.alias

  const whereEmpresa = {
    zona: decodedZona,
    ...(isVendedor ? { vendedorAsignado: userAlias } : {})
  }
  const whereAccion = {
    empresa: {
      zona: decodedZona,
      ...(isVendedor ? { vendedorAsignado: userAlias } : {})
    }
  }

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
      },
      ...whereAccion
    },
    include: { empresa: true },
    orderBy: { fechaVencimiento: 'asc' }
  })

  // Acciones para hoy — incluye TODOS los tipos: visita, whatsapp, correo, llamada
  // Estados incluidos: 'pendiente' (no gestionadas) — excluyendo 'visitada' que ya están en Tareas Pendientes
  const paraHoy = await prisma.accion.findMany({
    where: {
      estado: 'pendiente',
      fechaVencimiento: {
        gte: today,
        lt: tomorrow
      },
      ...whereAccion
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
      },
      ...whereAccion
    },
    include: { empresa: true },
    orderBy: { fechaVencimiento: 'asc' }
  })

  // Algoritmo Inteligente de Sugerencias
  const empresasAll = await prisma.empresa.findMany({
    where: whereEmpresa,
    include: {
      visitas: {
        orderBy: { fecha: 'desc' },
        take: 1
      }
    }
  })

  // Fetch available sub-zones in DB for this major zone
  const dbSubZonas = await prisma.subZona.findMany({
    where: { zona: decodedZona },
    orderBy: { nombre: 'asc' }
  })

  // Get unique sub-zones (combining predefined ones with actual company subZones)
  const zonasSet = new Set<string>()
  dbSubZonas.forEach(sz => zonasSet.add(sz.nombre.trim().toUpperCase()))
  empresasAll.forEach(emp => {
    if (emp.subZona) {
      zonasSet.add(emp.subZona.trim().toUpperCase())
    }
  })
  zonasSet.add('SIN ASIGNAR')
  zonasSet.add('CORREO')

  const currentMs = new Date().getTime()
  const sugerencias = []

  for (const emp of empresasAll) {
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
          zona: emp.subZona ? emp.subZona.trim().toUpperCase() : 'SIN ASIGNAR',
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
        zona: emp.subZona ? emp.subZona.trim().toUpperCase() : 'SIN ASIGNAR',
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
          marcarVisitadaAction={marcarVisitadaAction}
          gestionarAccionNoVisitaAction={gestionarAccionNoVisitaAction}
          cambiarTipoAccionAction={cambiarTipoAccionAction}
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
                    <td>{formatDate(accion.fechaVencimiento)}</td>
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
