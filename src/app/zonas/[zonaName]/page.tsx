import { prisma } from '@/lib/prisma'
import { Briefcase, Building2, CheckCircle, Clock, MapPin, BarChart2, Calendar as CalendarIcon } from 'lucide-react'
import Link from 'next/link'
import { DailyRouteChart } from '@/components/charts/DailyRouteChart'
import { MonthlyVisitsChart } from '@/components/charts/MonthlyVisitsChart'
import { WeeklyVisitsChart } from '@/components/charts/WeeklyVisitsChart'
import { PeriodFilter } from '@/components/PeriodFilter'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({ params, searchParams }: { params: Promise<{ zonaName: string }>, searchParams: Promise<{ period?: string }> }) {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  const { zonaName } = await params
  const decodedZona = decodeURIComponent(zonaName)
  
  const { period } = await searchParams
  const currentPeriod = period || String(new Date().getMonth())

  const modules = typeof user.modulos === 'string' ? JSON.parse(user.modulos) : (user.modulos || {})
  if (modules.zonas === false) {
    if (modules.pedidos) redirect('/pedidos')
    if (modules.ventas) redirect('/ventas')
    if (modules.cobranzas) redirect('/cobranzas')
    if (modules.usuarios) redirect('/usuarios')
    if (modules.configuracion) redirect('/configuracion')
    redirect('/configuracion/productos')
  }

  // Verify access permissions to this zone
  if (user.nivel === 3 && user.zona !== decodedZona) {
    if (user.zona && user.zona !== decodedZona) {
      redirect(`/zonas/${encodeURIComponent(user.zona)}`)
    } else if (!user.zona && decodedZona !== 'CABA') {
      redirect('/zonas/CABA')
    }
  } else if (user.nivel === 2) {
    let enabledZones: string[] = []
    try {
      if (user.zonasHabilitadas) {
        enabledZones = typeof user.zonasHabilitadas === 'string'
          ? JSON.parse(user.zonasHabilitadas)
          : JSON.parse(JSON.stringify(user.zonasHabilitadas))
      }
    } catch (e) {}
    // If they have no zones enabled or the Zonas module is disabled
    if (enabledZones.length === 0 || modules.zonas === false) {
      if (modules.pedidos) redirect('/pedidos')
      if (modules.ventas) redirect('/ventas')
      if (modules.cobranzas) redirect('/cobranzas')
      if (modules.usuarios) redirect('/usuarios')
      if (modules.configuracion) redirect('/configuracion')
      redirect('/configuracion/productos')
    }

    if (!enabledZones.includes(decodedZona)) {
      redirect(`/zonas/${enabledZones[0] || 'CABA'}`)
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
  const whereVisita = {
    empresa: {
      zona: decodedZona,
      ...(isVendedor ? { vendedorAsignado: userAlias } : {})
    }
  }

  const totalEmpresas = await prisma.empresa.count({ where: whereEmpresa })
  const empresasProspecto = await prisma.empresa.count({ where: { estado: 'prospecto', ...whereEmpresa } })
  const empresasClientes = await prisma.empresa.count({ where: { estado: 'activo', ...whereEmpresa } })
  const accionesPendientes = await prisma.accion.count({ where: { estado: 'pendiente', ...whereAccion } })


  // Efectividad: nuevos clientes este mes / empresas contactadas este mes × 100
  const now = new Date()
  let startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  let endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  let labelPeriodo = "este mes"

  if (currentPeriod.startsWith('Q')) {
    const q = parseInt(currentPeriod.charAt(1))
    startOfMonth = new Date(now.getFullYear(), (q - 1) * 3, 1)
    endOfMonth = new Date(now.getFullYear(), q * 3, 0, 23, 59, 59)
    labelPeriodo = `en Q${q}`
  } else {
    const m = parseInt(currentPeriod)
    startOfMonth = new Date(now.getFullYear(), m, 1)
    endOfMonth = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59)
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    labelPeriodo = `en ${monthNames[m]}`
  }

  const visitasMesQuery = await prisma.visita.findMany({
    where: { 
      fecha: { gte: startOfMonth, lte: endOfMonth },
      ...whereVisita
    },
    select: { empresaId: true },
    distinct: ['empresaId']
  })
  const empresasContactadasMes = visitasMesQuery.length

  // Para saber nuevos clientes, contamos las empresas activas cuya primera visita de venta fue este mes
  const activasParaEfectividad = await prisma.empresa.findMany({
    where: { 
      estado: 'activo',
      ...whereEmpresa
    },
    include: {
      visitas: {
        where: { resultado: 'venta' },
        orderBy: { fecha: 'asc' },
        take: 1
      }
    }
  })
  
  let nuevosClientesMes = 0
  for (const emp of activasParaEfectividad) {
    const primeraVenta = emp.visitas[0]
    const fechaAlta = primeraVenta ? new Date(primeraVenta.fecha) : new Date(emp.creadoEn)
    if (fechaAlta >= startOfMonth && fechaAlta <= endOfMonth) {
      nuevosClientesMes++
    }
  }

  const efectividad = empresasContactadasMes > 0
    ? Math.round((nuevosClientesMes / empresasContactadasMes) * 100)
    : null

  // Last 5 companies added or updated
  const recientes = await prisma.empresa.findMany({
    where: whereEmpresa,
    take: 5,
    orderBy: { actualizadoEn: 'desc' }
  })

  // Visitas programadas para hoy
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const visitasDeHoy = await prisma.accion.findMany({
    where: {
      estado: 'pendiente',
      tipo: 'visita_programada',
      fechaVencimiento: {
        gte: today,
        lt: tomorrow
      },
      ...whereAccion
    },
    include: {
      empresa: true
    },
    orderBy: [
      { orden: 'asc' },
      { id: 'asc' }
    ]
  })

  const proximaSemana = new Date(today)
  proximaSemana.setDate(proximaSemana.getDate() + 7)

  const visitasDeLaSemana = await prisma.accion.findMany({
    where: {
      estado: 'pendiente',
      tipo: 'visita_programada',
      fechaVencimiento: {
        gte: tomorrow,
        lt: proximaSemana
      },
      ...whereAccion
    },
    include: { empresa: true },
    orderBy: { fechaVencimiento: 'asc' }
  })

  // Obtener visitas registradas hoy (ejecutadas/reprogramadas)
  const visitasEjecutadasHoy = await prisma.visita.findMany({
    where: {
      fecha: {
        gte: today,
        lt: tomorrow
      },
      ...whereVisita
    }
  })

  const reprogramadasCount = visitasEjecutadasHoy.filter(v => v.resultado.toLowerCase().includes('reprogram')).length
  const atendidasCount = visitasEjecutadasHoy.length - reprogramadasCount

  // Obtener visitas del año en curso para el gráfico mensual
  const startOfYear = new Date(today.getFullYear(), 0, 1)
  const visitasEsteAño = await prisma.visita.findMany({
    where: {
      fecha: {
        gte: startOfYear
      },
      ...whereVisita
    },
    select: {
      fecha: true
    }
  })

  // Obtener visitas de la semana en curso (Lunes a Domingo)
  const startOfWeek = new Date(today)
  const dayOfWeek = startOfWeek.getDay()
  const diffToMonday = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Lunes
  startOfWeek.setDate(diffToMonday)
  startOfWeek.setHours(0, 0, 0, 0)
  
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(endOfWeek.getDate() + 7)

  const visitasSemana = await prisma.visita.findMany({
    where: {
      fecha: {
        gte: startOfWeek,
        lt: endOfWeek
      },
      ...whereVisita
    }
  })

  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const weeklyData = daysOfWeek.map((dayName, idx) => {
    const d = new Date(startOfWeek)
    d.setDate(d.getDate() + idx)
    const count = visitasSemana.filter(v => {
      const vf = new Date(v.fecha)
      return vf.getDate() === d.getDate() && vf.getMonth() === d.getMonth() && vf.getFullYear() === d.getFullYear()
    }).length
    return { name: dayName, visitas: count }
  })

  // ── Nuevos: primer venta en ese mes (este año)
  const clientesActivosTodos = await prisma.empresa.findMany({
    where: { 
      estado: 'activo',
      ...whereEmpresa
    },
    include: {
      visitas: {
        where: { resultado: 'venta' },
        orderBy: { fecha: 'asc' },
        take: 1
      }
    }
  })

  const nuevosPorMes = Array(12).fill(0)
  for (const emp of clientesActivosTodos) {
    const primerVenta = emp.visitas[0]
    const fechaAlta = primerVenta ? new Date(primerVenta.fecha) : new Date(emp.creadoEn)
    if (fechaAlta.getFullYear() === today.getFullYear()) {
      nuevosPorMes[fechaAlta.getMonth()]++
    }
  }

  // ── Activos: acumulado de clientes activos en cada mes
  //    Un cliente es ACTIVO en el mesIdx si su primer venta fue en un mes ANTERIOR
  //    Persiste mes a mes hasta que se marque como BAJA (manualmente)
  const currentYear = today.getFullYear()

  const activosPorMes = Array(12).fill(0)
  for (let mesIdx = 0; mesIdx < 12; mesIdx++) {
    for (const emp of clientesActivosTodos) {
      const primerVenta = emp.visitas[0]
      const fechaAlta = primerVenta ? new Date(primerVenta.fecha) : new Date(emp.creadoEn)
      const altaAno = fechaAlta.getFullYear()
      const altaMes = fechaAlta.getMonth()

      // Activo en mesIdx si: se convirtió en cliente en un año anterior
      // O se convirtió en cliente este año pero en un mes anterior al mesIdx
      const yaEraClienteAntes =
        altaAno < currentYear ||
        (altaAno === currentYear && altaMes < mesIdx)

      if (yaEraClienteAntes) {
        activosPorMes[mesIdx]++
      }
    }
  }


  // ── Bajas: empresas dadas de baja ese mes (usando actualizadoEn como fecha de baja)
  const empresasBaja = await prisma.empresa.findMany({
    where: { 
      estado: 'baja',
      ...whereEmpresa
    },
    select: { actualizadoEn: true }
  })

  const bajasPorMes = Array(12).fill(0)
  for (const emp of empresasBaja) {
    const fechaRef = new Date(emp.actualizadoEn)
    if (fechaRef.getFullYear() === today.getFullYear()) {
      bajasPorMes[fechaRef.getMonth()]++
    }
  }

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const monthlyData = months.map((month, idx) => ({
    month,
    visitas: visitasEsteAño.filter(v => v.fecha.getMonth() === idx).length,
    nuevos:  nuevosPorMes[idx],
    activos: activosPorMes[idx],
    bajas:   bajasPorMes[idx]
  }))


  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen de actividad y métricas clave.</p>
        </div>
        <div className="flex items-center gap-4">
          <PeriodFilter />
          <Link href="/empresas/nueva" className="btn btn-primary">
            + Nueva Empresa
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', marginBottom: '2rem' }}>
        <div className="glass-panel card" style={{ padding: '1rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
            <span className="stat-label" style={{ fontSize: '0.75rem' }}>Total Empresas</span>
            <div className="badge badge-info" style={{ padding: '0.15rem 0.4rem' }}><Building2 size={12} /></div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{totalEmpresas}</div>
          <div className="text-secondary" style={{ fontSize: '0.7rem' }}>Registradas</div>
        </div>
        
        <div className="glass-panel card delay-100" style={{ padding: '1rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
            <span className="stat-label" style={{ fontSize: '0.75rem' }}>Prospectos</span>
            <div className="badge badge-warning" style={{ padding: '0.15rem 0.4rem' }}><Briefcase size={12} /></div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{empresasProspecto}</div>
          <div className="text-secondary" style={{ fontSize: '0.7rem' }}>En seguimiento</div>
        </div>

        <div className="glass-panel card delay-150" style={{ padding: '1rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
            <span className="stat-label" style={{ fontSize: '0.75rem' }}>Clientes</span>
            <div className="badge badge-success" style={{ padding: '0.15rem 0.4rem' }}><Building2 size={12} /></div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{empresasClientes}</div>
          <div className="text-secondary" style={{ fontSize: '0.7rem' }}>Clientes activos</div>
        </div>
        
        <div className="glass-panel card delay-200" style={{ padding: '1rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
            <span className="stat-label" style={{ fontSize: '0.75rem' }}>Acciones</span>
            <div className="badge badge-danger" style={{ padding: '0.15rem 0.4rem' }}><Clock size={12} /></div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{accionesPendientes}</div>
          <div className="text-secondary" style={{ fontSize: '0.7rem' }}>Pendientes</div>
        </div>
        
        <div className="glass-panel card delay-300" style={{ padding: '1rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
            <span className="stat-label" style={{ fontSize: '0.75rem' }}>Efectividad</span>
            <div className="badge badge-success" style={{ padding: '0.15rem 0.4rem' }}><CheckCircle size={12} /></div>
          </div>
          <div className="stat-value text-accent" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>
            {efectividad !== null ? `${efectividad}%` : '-'}
          </div>
          <div className="text-secondary" style={{ fontSize: '0.7rem' }}>
            {empresasContactadasMes > 0 
              ? `${nuevosClientesMes} nuevo(s) / ${empresasContactadasMes} contactadas ${labelPeriodo}` 
              : `Sin contactos ${labelPeriodo}`}
          </div>
        </div>
      </div>

      {/* Row: Planificador Diario and Planificador Semanal (50% each) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Planificador de Hoy */}
        <div className="glass-panel card delay-200" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-title">Planificador de Hoy</h3>
          <p className="card-subtitle" style={{ marginBottom: '1.5rem' }}>Visitas programadas para hoy ({visitasDeHoy.length}).</p>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {visitasDeHoy.length === 0 ? (
              <div className="flex flex-col gap-4 items-center justify-center h-full" style={{ minHeight: '200px', opacity: 0.5 }}>
                <MapPin size={48} />
                <p>No hay visitas programadas para hoy.</p>
                <Link href={`/zonas/${zonaName}/planificador`} className="btn btn-secondary">
                  Ir al Planificador
                </Link>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {visitasDeHoy.map((visita, index) => (
                    <div key={visita.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.875rem', flexShrink: 0 }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <Link href={`/zonas/${zonaName}/empresas/${visita.empresaId}`} style={{ fontWeight: 500, fontSize: '0.875rem', color: 'white', display: 'block' }}>
                          {visita.empresa.nombre}
                        </Link>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {visita.empresa.zona || 'Sin Zona'} • {visita.empresa.barrio || 'Sin Localidad'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <Link href={`/zonas/${zonaName}/planificador?vista=hoy`} className="btn btn-primary" style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}>
                    Ir a la Ruta Completa
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Ruta de la Semana */}
        <div className="glass-panel card delay-250" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-title">Ruta de la Semana</h3>
          <p className="card-subtitle" style={{ marginBottom: '1.5rem' }}>Próximos 7 días ({visitasDeLaSemana.length} planificadas).</p>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {visitasDeLaSemana.length === 0 ? (
              <div className="flex flex-col gap-4 items-center justify-center h-full" style={{ minHeight: '200px', opacity: 0.5 }}>
                <CalendarIcon size={48} />
                <p>No hay visitas planificadas para los próximos días.</p>
                <Link href={`/zonas/${zonaName}/planificador?vista=semana`} className="btn btn-secondary">
                  Planificar Semana
                </Link>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {Object.entries(
                    visitasDeLaSemana.reduce((acc, visita) => {
                      const dateKey = visita.fechaVencimiento!.toISOString().split('T')[0]
                      if (!acc[dateKey]) acc[dateKey] = []
                      acc[dateKey].push(visita)
                      return acc
                    }, {} as Record<string, typeof visitasDeLaSemana>)
                  ).sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                  .map(([dateKey, visitas]) => {
                    const dateObj = new Date(dateKey + 'T12:00:00Z')
                    return (
                      <div key={dateKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', paddingBottom: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          {dateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                        {visitas.map((visita) => (
                          <div key={visita.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                            <div style={{ flex: 1 }}>
                              <Link href={`/zonas/${zonaName}/empresas/${visita.empresaId}`} style={{ fontWeight: 500, fontSize: '0.875rem', color: 'white', display: 'block' }}>
                                {visita.empresa.nombre}
                              </Link>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {visita.empresa.zona || 'Sin Zona'} • {visita.empresa.barrio || 'Sin Localidad'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <Link href={`/zonas/${zonaName}/planificador?vista=semana`} className="btn btn-primary" style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}>
                    Ver Planificador Semanal
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress Charts (Daily 30% and Weekly 70%) */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '3fr 7fr', marginTop: '1.5rem' }}>
        <div className="glass-panel card delay-300" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-title">Estado de Ruta Diaria</h3>
          <p className="card-subtitle" style={{ marginBottom: '1.5rem' }}>Progreso de hoy</p>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DailyRouteChart 
              planificadas={visitasDeHoy.length} 
              atendidas={atendidasCount} 
              reprogramadas={reprogramadasCount} 
            />
          </div>
        </div>

        <div className="glass-panel card delay-350" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-title">Visitas de la Semana</h3>
          <p className="card-subtitle" style={{ marginBottom: '1.5rem' }}>Visitas realizadas en los últimos 7 días</p>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <WeeklyVisitsChart data={weeklyData} />
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="glass-panel card delay-400" style={{ marginTop: '1.5rem' }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart2 size={18} /> Visitas por Mes
        </h3>
        <p className="card-subtitle" style={{ marginBottom: '1.5rem' }}>Rendimiento anual del {today.getFullYear()}</p>
        <MonthlyVisitsChart data={monthlyData} />
      </div>

      {/* Actualizaciones Recientes */}
      <div className="glass-panel card delay-100 mt-6">
        <h3 className="card-title">Actualizaciones Recientes</h3>
        <p className="card-subtitle">Las últimas fichas modificadas.</p>
        
        <div className="table-container" style={{ marginTop: '1rem' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Zona</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {recientes.map(emp => (
                <tr key={emp.id}>
                  <td style={{ fontWeight: 500 }}>{emp.nombre}</td>
                  <td>{emp.zona || '-'}</td>
                  <td>
                    <span className={`badge ${emp.estado === 'prospecto' ? 'badge-warning' : emp.estado === 'activo' ? 'badge-success' : 'badge-neutral'}`}>
                      {emp.estado}
                    </span>
                  </td>
                  <td>{new Date(emp.actualizadoEn).toLocaleDateString()}</td>
                  <td>
                    <Link href={`/zonas/${zonaName}/empresas/${emp.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {recientes.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No hay empresas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
