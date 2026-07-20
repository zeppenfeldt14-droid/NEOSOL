import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Map as MapIcon, Clock, AlertTriangle, Calendar as CalendarIcon, FileText, ShoppingBag, Landmark, UserPlus, CheckCircle, BarChart2 } from 'lucide-react'
import { PeriodFilter } from '@/components/PeriodFilter'
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
  searchParams: Promise<{ vista?: string; period?: string; tab?: string }>
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

  // Acciones próximas (Agenda de Acciones y Tareas futuras)
  const proximas = await prisma.accion.findMany({
    where: {
      estado: 'pendiente',
      OR: [
        {
          fechaVencimiento: {
            gte: tomorrow
          }
        },
        {
          fechaVencimiento: null
        }
      ],
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

    if (emp.estado === 'activo') {
      const ciclo = emp.cicloVentaDias || 30
      const diasAlerta = ciclo - 7
      if (diasDesde !== null && diasDesde >= diasAlerta) {
        sugerencias.push({
          id: emp.id,
          nombre: emp.nombre,
          zona: emp.subZona ? emp.subZona.trim().toUpperCase() : 'SIN ASIGNAR',
          barrio: emp.barrio,
          direccion: emp.direccion,
          telefono: emp.telefono,
          estado: emp.estado,
          cicloVentaDias: ciclo,
          diasDesdeUltimaVisita: diasDesde,
          motivo: `Verificar pedido (Ciclo: ${ciclo} días, última visita hace ${diasDesde} días)`
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
    } else if (emp.estado === 'baja') {
      // Regla de bajas: auto-sugerir visitas si han pasado 60 días desde la fecha de baja (o última visita)
      const fechaReferencia = emp.fechaBaja || ultimaVisita
      let diasDesdeRef = null
      if (fechaReferencia) {
        diasDesdeRef = Math.floor((currentMs - new Date(fechaReferencia).getTime()) / (1000 * 60 * 60 * 24))
      }

      if (diasDesdeRef === null || diasDesdeRef >= 60) {
        sugerencias.push({
          id: emp.id,
          nombre: emp.nombre,
          zona: emp.subZona ? emp.subZona.trim().toUpperCase() : 'SIN ASIGNAR',
          barrio: emp.barrio,
          direccion: emp.direccion,
          telefono: emp.telefono,
          estado: emp.estado,
          cicloVentaDias: 60,
          diasDesdeUltimaVisita: diasDesdeRef,
          motivo: diasDesdeRef === null 
            ? 'Cliente de BAJA sin fecha registrada (Re-contactar)' 
            : `Re-contactar cliente de BAJA (pasaron ${diasDesdeRef} días)`
        })
      }
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

  const period = searchParams.period || String(today.getMonth())
  const tab = searchParams.tab || 'acciones'

  let startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  let endOfMonth   = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
  let labelPeriodo = "este mes"

  if (period.startsWith('Q')) {
    const q = parseInt(period.charAt(1))
    startOfMonth = new Date(today.getFullYear(), (q - 1) * 3, 1)
    endOfMonth = new Date(today.getFullYear(), q * 3, 0, 23, 59, 59)
    labelPeriodo = `Q${q}`
  } else {
    const m = parseInt(period)
    startOfMonth = new Date(today.getFullYear(), m, 1)
    endOfMonth = new Date(today.getFullYear(), m + 1, 0, 23, 59, 59)
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    labelPeriodo = monthNames[m]
  }

  const accionesMes = vista === 'mes' ? await prisma.accion.findMany({
    where: {
      fechaVencimiento: { gte: startOfMonth, lte: endOfMonth },
      ...whereAccion
    },
    include: { empresa: true },
    orderBy: { fechaVencimiento: 'asc' }
  }) : []

  const visitasMes = vista === 'mes' ? await prisma.visita.findMany({
    where: {
      fecha: { gte: startOfMonth, lte: endOfMonth },
      empresa: {
        zona: decodedZona,
        ...(isVendedor ? { vendedorAsignado: userAlias } : {})
      }
    },
    include: { empresa: true },
    orderBy: { fecha: 'desc' }
  }) : []

  const nuevosProspectosMes = vista === 'mes' ? await prisma.empresa.findMany({
    where: {
      creadoEn: { gte: startOfMonth, lte: endOfMonth },
      zona: decodedZona,
      ...(isVendedor ? { vendedorAsignado: userAlias } : {})
    },
    orderBy: { creadoEn: 'desc' }
  }) : []

  const pedidosMes = vista === 'mes' ? await prisma.pedido.findMany({
    where: {
      creadoEn: { gte: startOfMonth, lte: endOfMonth },
      zona: decodedZona,
      ...(isVendedor ? { vendedorAlias: userAlias } : {})
    },
    include: { empresa: true },
    orderBy: { creadoEn: 'desc' }
  }) : []

  const pendingActionDeletes = await prisma.solicitudEliminacion.findMany({
    where: { tipo: 'ACCION', estado: 'pendiente' },
    select: { targetId: true }
  })
  const pendingActionDeleteIds = pendingActionDeletes.map(r => r.targetId)

  return (
    <div className="animate-fade-in pb-12">
      <div className="page-header">
        <div>
          <h1 className="page-title">Planificador de Rutas</h1>
          <p className="page-subtitle">
            {vista === 'hoy' ? `Organiza tus visitas para hoy: ${today.toLocaleDateString()}` : 
             vista === 'semana' ? 'Agenda de Acciones y Tareas futuras.' :
             `Informe Ejecutivo de Gestiones (${labelPeriodo})`}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <Link href={`?vista=hoy&period=${period}`} className={`btn ${vista === 'hoy' ? 'btn-primary' : 'btn-secondary'}`}>
          Visitas del Día
        </Link>
        <Link href={`?vista=semana&period=${period}`} className={`btn ${vista === 'semana' ? 'btn-primary' : 'btn-secondary'}`}>
          Agenda de Acciones y Tareas futuras
        </Link>
        <Link href={`?vista=mes&period=${period}`} className={`btn ${vista === 'mes' ? 'btn-primary' : 'btn-secondary'}`}>
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
          accionesVencidas={vencidas}
          userNivel={user.nivel}
          userAlias={user.alias}
          pendingActionDeleteIds={pendingActionDeleteIds}
          eliminarAccionAction={eliminarAccionAction}
          reagendarAccionAction={reagendarAccionAction}
          reordenarRutaAction={reordenarRutaAction}
          marcarVisitadaAction={marcarVisitadaAction}
          gestionarAccionNoVisitaAction={gestionarAccionNoVisitaAction}
          cambiarTipoAccionAction={cambiarTipoAccionAction}
          vista={vista}
          empresasList={empresasAll.map(emp => ({ id: emp.id, nombre: emp.nombre }))}
          zonaNameStr={decodedZona}
        />
      )}

      {vista === 'mes' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header del Informe con PeriodFilter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart2 className="text-primary" /> Informe Ejecutivo de Gestiones ({labelPeriodo})
              </h2>
              <p className="text-xs text-slate-400">Resumen acumulado diario de gestiones y resultados de la zona {decodedZona}.</p>
            </div>
            <PeriodFilter />
          </div>

          {/* Grid de KPIs Ejecutivos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Card 1: Acciones Planificadas */}
            <div className="glass-panel card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Acciones Planificadas</span>
                <CheckCircle size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white' }}>{accionesMes.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Completadas: <strong style={{ color: '#10b981' }}>{accionesMes.filter(a => a.estado === 'completada').length}</strong> | 
                Pendientes: <strong>{accionesMes.filter(a => a.estado === 'pendiente').length}</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                Cumplimiento: <strong>{accionesMes.length > 0 ? Math.round((accionesMes.filter(a => a.estado === 'completada').length / accionesMes.length) * 100) : 0}%</strong>
              </div>
            </div>

            {/* Card 2: Visitas Registradas */}
            <div className="glass-panel card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Visitas Físicas</span>
                <MapIcon size={18} style={{ color: '#10b981' }} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white' }}>{visitasMes.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Visitas presenciales y gestiones de calle registradas con check-in en el CRM.
              </div>
            </div>

            {/* Card 3: Ventas Cerradas */}
            <div className="glass-panel card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Monto Pedidos</span>
                <ShoppingBag size={18} style={{ color: '#f59e0b' }} />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                ${pedidosMes.reduce((acc, p) => acc + p.totalGeneral, 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <strong>{pedidosMes.length}</strong> pedidos emitidos en {labelPeriodo}.
              </div>
            </div>

            {/* Card 4: Nuevas Oportunidades */}
            <div className="glass-panel card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.25rem', borderLeft: '4px solid #818cf8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Nuevas Oportunidades</span>
                <UserPlus size={18} style={{ color: '#818cf8' }} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white' }}>{nuevosProspectosMes.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Clientes prospectos agregados en la zona {decodedZona}.
              </div>
            </div>
          </div>

          {/* Tabs Navegación para Historial */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
            <Link href={`?vista=mes&period=${period}&tab=acciones`} className={`btn text-xs ${tab === 'acciones' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.35rem 0.75rem' }}>
              Acciones Planificadas ({accionesMes.length})
            </Link>
            <Link href={`?vista=mes&period=${period}&tab=visitas`} className={`btn text-xs ${tab === 'visitas' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.35rem 0.75rem' }}>
              Bitácora de Visitas ({visitasMes.length})
            </Link>
            <Link href={`?vista=mes&period=${period}&tab=pedidos`} className={`btn text-xs ${tab === 'pedidos' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.35rem 0.75rem' }}>
              Pedidos Emitidos ({pedidosMes.length})
            </Link>
            <Link href={`?vista=mes&period=${period}&tab=nuevos`} className={`btn text-xs ${tab === 'nuevos' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.35rem 0.75rem' }}>
              Nuevas Oportunidades ({nuevosProspectosMes.length})
            </Link>
          </div>

          {/* Contenido de cada Tab */}
          {tab === 'acciones' && (
            <div className="glass-panel card">
              <h3 className="card-title">Listado de Acciones Planificadas</h3>
              <div className="table-container mt-4">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Empresa</th>
                      <th>Tipo de Gestión</th>
                      <th>Prioridad</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accionesMes.map(accion => (
                      <tr key={accion.id}>
                        <td>{formatDate(accion.fechaVencimiento)}</td>
                        <td style={{ fontWeight: 500 }}>
                          <Link href={`/zonas/${decodedZona}/empresas/${accion.empresaId}`} className="text-primary hover:underline font-semibold">
                            {accion.empresa.nombre}
                          </Link>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>
                          {accion.tipo.replace('_', ' ')}
                        </td>
                        <td>
                          <span className={`badge ${accion.prioridad === 'alta' ? 'badge-danger' : 'badge-neutral'}`}>
                            {accion.prioridad}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${accion.estado === 'completada' ? 'badge-success' : 'badge-warning'}`}>
                            {accion.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {accionesMes.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay acciones en este periodo.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'visitas' && (
            <div className="glass-panel card">
              <h3 className="card-title">Bitácora de Visitas Realizadas</h3>
              <div className="table-container mt-4">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha / Hora</th>
                      <th>Empresa</th>
                      <th>Tipo</th>
                      <th>Contacto / Cargo</th>
                      <th>Resultado / Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitasMes.map(vis => (
                      <tr key={vis.id}>
                        <td>{new Date(vis.fecha).toLocaleString('es-AR')}</td>
                        <td style={{ fontWeight: 500 }}>
                          <Link href={`/zonas/${decodedZona}/empresas/${vis.empresaId}`} className="text-primary hover:underline font-semibold">
                            {vis.empresa.nombre}
                          </Link>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>
                          <span className="badge badge-success">{vis.tipo}</span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem', color: 'white' }}>{vis.contacto || '-'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{vis.cargo || ''}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: '0.85rem', color: 'white' }}>{vis.resultado}</div>
                          {vis.notas && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                              "{vis.notas}"
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {visitasMes.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No se registraron visitas en este periodo.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'pedidos' && (
            <div className="glass-panel card">
              <h3 className="card-title">Pedidos Emitidos</h3>
              <div className="table-container mt-4">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nº Pedido</th>
                      <th>Fecha</th>
                      <th>Empresa</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosMes.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          <Link href={`/pedidos`} className="hover:underline">
                            {p.numeroPedido}
                          </Link>
                        </td>
                        <td>{new Date(p.creadoEn).toLocaleDateString('es-AR')}</td>
                        <td style={{ fontWeight: 500 }}>
                          <Link href={`/zonas/${decodedZona}/empresas/${p.empresaId}`} className="text-primary hover:underline font-semibold">
                            {p.empresa.nombre}
                          </Link>
                        </td>
                        <td>
                          <span className={`badge ${p.estado === 'aprobado' ? 'badge-success' : p.estado === 'cancelado' ? 'badge-danger' : 'badge-warning'}`}>
                            {p.estado}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'white' }}>
                          ${p.totalGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    {pedidosMes.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No se emitieron pedidos en este periodo.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'nuevos' && (
            <div className="glass-panel card">
              <h3 className="card-title">Nuevos Clientes & Oportunidades</h3>
              <div className="table-container mt-4">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha de Alta</th>
                      <th>Empresa</th>
                      <th>Dirección</th>
                      <th>Estado Inicial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nuevosProspectosMes.map(emp => (
                      <tr key={emp.id}>
                        <td>{new Date(emp.creadoEn).toLocaleDateString('es-AR')}</td>
                        <td style={{ fontWeight: 500 }}>
                          <Link href={`/zonas/${decodedZona}/empresas/${emp.id}`} className="text-primary hover:underline font-semibold">
                            {emp.nombre}
                          </Link>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem', color: 'white' }}>{emp.direccion || '-'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.barrio}</div>
                        </td>
                        <td>
                          <span className={`badge ${emp.estado === 'prospecto' ? 'badge-warning' : emp.estado === 'activo' ? 'badge-success' : 'badge-neutral'}`}>
                            {emp.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {nuevosProspectosMes.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No se agregaron nuevas empresas en este periodo.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
