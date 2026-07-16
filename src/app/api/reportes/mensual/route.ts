import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')
    const zonaParam = searchParams.get('zona') // zona de la página que se está navegando

    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    let whereClause: any = {}
    
    // RBAC logic (mismo que historial)
    if (session.nivel === 2) {
      let zonas: string[] = []
      if (Array.isArray(session.zonasHabilitadas)) zonas = [...session.zonasHabilitadas]
      if (session.zona && !zonas.includes(session.zona)) zonas.push(session.zona)
      whereClause.empresa = { zona: { in: zonas } }
    } else if (session.nivel >= 3) {
      whereClause.empresa = { zona: session.zona || '', vendedorAsignado: session.alias }
    }

    if (zonaParam) {
      if (!whereClause.empresa) whereClause.empresa = {}
      if (whereClause.empresa.zona && typeof whereClause.empresa.zona === 'object' && 'in' in whereClause.empresa.zona) {
        const allowed = whereClause.empresa.zona.in as string[]
        if (allowed.includes(zonaParam)) {
          whereClause.empresa.zona = zonaParam
        } else {
          return NextResponse.json({ reportes: [] })
        }
      } else if (whereClause.empresa.zona && whereClause.empresa.zona !== zonaParam) {
        return NextResponse.json({ reportes: [] })
      } else {
        whereClause.empresa.zona = zonaParam
      }
    }

    let startDate = new Date()
    let endDate = new Date()
    const year = new Date().getFullYear()

    if (period !== null && period !== undefined && period !== '') {
      if (period.startsWith('Q')) {
        const q = parseInt(period.replace('Q', ''))
        startDate = new Date(year, (q - 1) * 3, 1)
        endDate = new Date(year, q * 3, 0, 23, 59, 59)
      } else {
        const month = parseInt(period)
        startDate = new Date(year, month, 1)
        endDate = new Date(year, month + 1, 0, 23, 59, 59)
      }
      whereClause.fecha = { gte: startDate, lte: endDate }
    }

    // Traer visitas del periodo
    const visitasDB = await prisma.visita.findMany({ 
      where: whereClause,
      include: { empresa: true },
      orderBy: { fecha: 'desc' }
    })

    let pendingWhereClause = { ...whereClause }
    if (pendingWhereClause.fecha) {
        pendingWhereClause.creadoEn = pendingWhereClause.fecha;
        delete pendingWhereClause.fecha;
    }
    const pendientesDB = await prisma.accion.findMany({ 
      where: pendingWhereClause,
      include: { empresa: true }
    })

    // Calcular KPIs
    let totalVisitas = visitasDB.length
    let empresasActivas = 0
    let empresasBajas = 0
    let accionesCompletadas = 0
    let accionesPendientes = 0
    let detalleVisitas: any[] = []

    visitasDB.forEach(v => {
      const res = v.resultado.toLowerCase()
      if (res.includes('cerrad') || res.includes('positiv') || res.includes('venta') || res.includes('muestra')) empresasActivas++
      if (res.includes('rechazad') || res.includes('sin_contacto') || res.includes('baja') || res.includes('negativ')) empresasBajas++
      
      if (detalleVisitas.length < 20) {
        detalleVisitas.push({
          id: v.id,
          empresaNombre: v.empresa.nombre,
          direccion: v.empresa.direccion,
          barrio: v.empresa.barrio,
          resultado: v.resultado,
          contacto: v.contacto,
          notas: v.notas,
          proximaAccion: v.proximaAccion
        })
      }
    })

    pendientesDB.forEach(p => {
      if (p.estado !== 'pendiente') accionesCompletadas++
      else accionesPendientes++
    })

    const kpis = {
      totalVisitas,
      empresasActivas,
      empresasBajas,
      accionesCompletadas,
      accionesPendientes
    }

    const reportName = period?.startsWith('Q') ? `Trimestre ${period}` : `Mes ${parseInt(period || '0') + 1}`

    const monthlyReportData = {
      isMonthly: true,
      fecha: `Cierre ${reportName} - ${year}`,
      vendedorAlias: session.alias,
      zona: zonaParam || session.zona || 'Varias',
      kpis,
      visitasDestacadas: detalleVisitas,
      notas: `Resumen ejecutivo generado automáticamente. Evaluadas ${totalVisitas} visitas en el periodo.`
    }

    return NextResponse.json({ reportData: monthlyReportData })
  } catch (error) {
    console.error('Error generando reporte mensual:', error)
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 })
  }
}
