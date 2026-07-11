import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { InicioPageClient } from './InicioPageClient'

export default async function IndexPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await getSessionUser()
  
  if (!user) {
    redirect('/login')
  }

  const modules = typeof user.modulos === 'string' ? JSON.parse(user.modulos) : (user.modulos || {})

  // If Zonas is explicitly disabled AND they deactivated the new Inicio module
  if (modules.inicio === false) {
    if (modules.zonas !== false) {
      let targetZone = 'CABA'
      if (user.nivel === 3) {
        targetZone = user.zona || 'CABA'
      } else {
        let enabledZones: string[] = []
        try {
          if (user.zonasHabilitadas) {
            enabledZones = typeof user.zonasHabilitadas === 'string'
              ? JSON.parse(user.zonasHabilitadas)
              : JSON.parse(JSON.stringify(user.zonasHabilitadas))
          }
        } catch (e) {}
        if (enabledZones && enabledZones.length > 0) {
          targetZone = enabledZones[0]
        }
      }
      redirect(`/zonas/${targetZone}`)
    } else {
      if (modules.pedidos) redirect('/pedidos')
      if (modules.ventas) redirect('/ventas')
      if (modules.cobranzas) redirect('/cobranzas')
      if (modules.usuarios) redirect('/usuarios')
      if (modules.configuracion) redirect('/configuracion')
      redirect('/configuracion/productos')
    }
  }

  const isVendedor = user.nivel === 3
  const userAlias = user.alias
  const userZona = user.zona

  // Date Filtering Logic
  const now = new Date()
  const currentMonthIndex = now.getMonth()
  
  let dateFilters: any[] = []
  let isPeriodFiltered = true

  const resolvedParams = await searchParams
  const periodValue = resolvedParams.period || 'mes'

  if (periodValue === 'hoy') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    dateFilters = [{ gte: start, lte: end }]
  } else if (periodValue === 'semana') {
    const start = new Date(now)
    start.setDate(now.getDate() - 7)
    dateFilters = [{ gte: start, lte: now }]
  } else if (periodValue === 'todo') {
    isPeriodFiltered = false
  } else {
    let selectedMonths: number[] = []
    if (periodValue === 'mes') {
      selectedMonths = [currentMonthIndex]
    } else {
      selectedMonths = periodValue.split(',').map(Number).filter(n => !isNaN(n))
    }

    dateFilters = selectedMonths.map(m => {
      const start = new Date(now.getFullYear(), m, 1, 0, 0, 0)
      const end = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59)
      return { gte: start, lte: end }
    })
  }

  // Queries
  // 1. Facturas
  const facturasMes = await prisma.factura.findMany({
    where: {
      NOT: { estado: 'anulada' },
      ...(isVendedor ? { pedido: { vendedorAlias: userAlias } } : {}),
      ...(isPeriodFiltered ? {
        OR: dateFilters.map(filter => ({ creadoEn: filter }))
      } : {})
    },
    include: {
      pedido: true
    }
  })
  
  const totalFacturado = facturasMes.reduce((acc, f) => acc + f.total, 0)
  const facturadoA = facturasMes.filter(f => f.tipo === 'A').reduce((acc, f) => acc + f.total, 0)
  const facturadoB = facturasMes.filter(f => f.tipo !== 'A').reduce((acc, f) => acc + f.total, 0)

  // 2. Cobrado (Sum of payments)
  const pagosMes = await prisma.pago.findMany({
    where: {
      ...(isVendedor ? {
        OR: [
          { cobranza: { vendedorAlias: userAlias } },
          { factura: { pedido: { vendedorAlias: userAlias } } }
        ]
      } : {}),
      ...(isPeriodFiltered ? {
        OR: dateFilters.map(filter => ({ creadoEn: filter }))
      } : {})
    }
  })
  const totalCobrado = pagosMes.reduce((acc, p) => acc + p.monto, 0)

  // 3. Cobranza Pendiente
  const cobranzasMes = await prisma.cobranza.findMany({
    where: {
      ...(isVendedor ? { vendedorAlias: userAlias } : {}),
      ...(isPeriodFiltered ? {
        OR: dateFilters.map(filter => ({ creadoEn: filter }))
      } : {})
    }
  })
  const cobranzaPendiente = cobranzasMes.reduce((acc, c) => acc + c.saldoPendiente, 0)

  // 4. Cajas Vendidas (cajas in approved orders)
  const targetPedidos = await prisma.pedido.findMany({
    where: {
      estado: 'aprobado',
      ...(isVendedor ? { vendedorAlias: userAlias } : {}),
      ...(isPeriodFiltered ? {
        OR: dateFilters.map(filter => ({ creadoEn: filter }))
      } : {})
    },
    include: {
      detalles: true
    }
  })
  const cajasVendidas = targetPedidos.reduce((acc, p) => acc + p.detalles.reduce((sum, d) => sum + d.cantidadCajas, 0), 0)

  // 5. Clientes
  const clientesActivos = await prisma.empresa.count({
    where: {
      estado: 'activo',
      ...(isVendedor ? { zona: userZona || 'CABA', vendedorAsignado: userAlias } : {})
    }
  })
  const clientesProspecto = await prisma.empresa.count({
    where: {
      estado: 'prospecto',
      ...(isVendedor ? { zona: userZona || 'CABA', vendedorAsignado: userAlias } : {})
    }
  })

  // Recent Activities (Always absolute latest, not filtered by period for better UX)
  const recentPedidos = await prisma.pedido.findMany({
    take: 5,
    orderBy: { creadoEn: 'desc' },
    where: isVendedor ? { vendedorAlias: userAlias } : {},
    include: { empresa: true }
  })

  const recentVentas = await prisma.factura.findMany({
    take: 5,
    orderBy: { creadoEn: 'desc' },
    where: isVendedor ? { pedido: { vendedorAlias: userAlias } } : {},
    include: {
      pedido: {
        include: {
          empresa: true
        }
      }
    }
  })

  // Chart aggregations
  // A. Product Sales (Pie Chart)
  const productMap: Record<string, number> = {}
  for (const p of targetPedidos) {
    for (const d of p.detalles) {
      productMap[d.productoNombre] = (productMap[d.productoNombre] || 0) + d.cantidadCajas
    }
  }
  const chartProductos = Object.entries(productMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  // B. Sales by Zone (Vertical Bar Chart)
  const zoneMap: Record<string, number> = {}
  for (const f of facturasMes) {
    const zone = f.pedido.zona || 'Sin Zona'
    zoneMap[zone] = (zoneMap[zone] || 0) + f.total
  }
  const chartZonas = Object.entries(zoneMap).map(([zone, sales]) => ({ zone, sales }))

  // C. Collected by Method (Horizontal Bar Chart)
  const methodMap: Record<string, number> = {}
  for (const p of pagosMes) {
    const method = (p.metodoPago || 'Efectivo').toUpperCase()
    methodMap[method] = (methodMap[method] || 0) + p.monto
  }
  const chartMetodos = Object.entries(methodMap).map(([method, amount]) => ({ method, amount }))

  const dashboardData = {
    kpis: {
      totalFacturado,
      totalCobrado,
      cobranzaPendiente,
      cajasVendidas,
      clientesActivos,
      clientesProspecto
    },
    salesDistribution: {
      facturadoA,
      facturadoB
    },
    recentActivity: {
      pedidos: recentPedidos,
      ventas: recentVentas
    },
    charts: {
      productos: chartProductos,
      zonas: chartZonas,
      metodos: chartMetodos
    }
  }

  return (
    <InicioPageClient data={dashboardData} currentUser={user} />
  )
}
