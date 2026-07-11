import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { InicioPageClient } from './InicioPageClient'

export default async function IndexPage() {
  const user = await getSessionUser()
  
  if (!user) {
    redirect('/login')
  }

  const modules = typeof user.modulos === 'string' ? JSON.parse(user.modulos) : (user.modulos || {})

  // If Zonas is explicitly disabled AND they deactivated the new Inicio module
  if (modules.inicio === false) {
    if (modules.zonas !== false) {
      // Fallback redirect to their zone if they have one assigned
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
      // Fallback redirects to other modules
      if (modules.pedidos) redirect('/pedidos')
      if (modules.ventas) redirect('/ventas')
      if (modules.cobranzas) redirect('/cobranzas')
      if (modules.usuarios) redirect('/usuarios')
      if (modules.configuracion) redirect('/configuracion')
      redirect('/configuracion/productos')
    }
  }

  // Fetch Consolidated KPIs
  const isVendedor = user.nivel === 3
  const userAlias = user.alias
  const userZona = user.zona

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // 1. Facturado
  const facturasMes = await prisma.factura.findMany({
    where: {
      creadoEn: { gte: startOfMonth, lte: endOfMonth },
      NOT: { estado: 'anulada' },
      ...(isVendedor ? { pedido: { vendedorAlias: userAlias } } : {})
    }
  })
  
  const totalFacturado = facturasMes.reduce((acc, f) => acc + f.total, 0)
  const facturadoA = facturasMes.filter(f => f.tipo === 'A').reduce((acc, f) => acc + f.total, 0)
  const facturadoB = facturasMes.filter(f => f.tipo !== 'A').reduce((acc, f) => acc + f.total, 0)

  // 2. Cobrado (Sum of payments)
  const pagosMes = await prisma.pago.findMany({
    where: {
      creadoEn: { gte: startOfMonth, lte: endOfMonth },
      ...(isVendedor ? {
        OR: [
          { cobranza: { vendedorAlias: userAlias } },
          { factura: { pedido: { vendedorAlias: userAlias } } }
        ]
      } : {})
    }
  })
  const totalCobrado = pagosMes.reduce((acc, p) => acc + p.monto, 0)

  // 3. Visitas
  const visitasMes = await prisma.visita.count({
    where: {
      fecha: { gte: startOfMonth, lte: endOfMonth },
      ...(isVendedor ? { registradoPorAlias: userAlias } : {})
    }
  })

  // 4. Clientes
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

  // Recent Activities
  const recentPedidos = await prisma.pedido.findMany({
    take: 5,
    orderBy: { creadoEn: 'desc' },
    where: isVendedor ? { vendedorAlias: userAlias } : {},
    include: { empresa: true }
  })

  const recentVisitas = await prisma.visita.findMany({
    take: 5,
    orderBy: { fecha: 'desc' },
    where: isVendedor ? { registradoPorAlias: userAlias } : {},
    include: { empresa: true }
  })

  const dashboardData = {
    kpis: {
      totalFacturado,
      totalCobrado,
      visitasMes,
      clientesActivos,
      clientesProspecto
    },
    salesDistribution: {
      facturadoA,
      facturadoB
    },
    recentActivity: {
      pedidos: recentPedidos,
      visitas: recentVisitas
    }
  }

  return (
    <InicioPageClient data={dashboardData} currentUser={user} />
  )
}
