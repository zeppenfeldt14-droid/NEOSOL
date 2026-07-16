import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { formatDate } from '@/lib/date'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    let whereClause: any = {}
    
    // RBAC logic (same as historial)
    if (session.nivel === 2) {
      let zonas: string[] = []
      if (Array.isArray(session.zonasHabilitadas)) zonas = [...session.zonasHabilitadas]
      if (session.zona && !zonas.includes(session.zona)) zonas.push(session.zona)
      whereClause.zona = { in: zonas }
    } else if (session.nivel >= 3) {
      whereClause.zona = session.zona || ''
    }

    let startDate = new Date()
    let endDate = new Date()
    const year = new Date().getFullYear()

    if (period !== null && period !== undefined) {
      if (period.startsWith('Q')) {
        const q = parseInt(period.replace('Q', ''))
        startDate = new Date(year, (q - 1) * 3, 1)
        endDate = new Date(year, q * 3, 0, 23, 59, 59)
      } else {
        const month = parseInt(period)
        startDate = new Date(year, month, 1)
        endDate = new Date(year, month + 1, 0, 23, 59, 59)
      }
      whereClause.creadoEn = { gte: startDate, lte: endDate }
    }

    // Traer todos los reportes del periodo
    const reportesDB = await prisma.reporteVisitas.findMany({ where: whereClause })

    // Calcular KPIs
    let totalVisitas = 0
    let empresasActivas = 0
    let empresasBajas = 0
    let accionesCompletadas = 0
    let accionesPendientes = 0
    let detalleVisitas: any[] = []

    reportesDB.forEach(rep => {
      let datos: any = {}
      try {
        datos = JSON.parse(rep.datosJSON)
      } catch (e) {}
      
      if (datos.visitas && Array.isArray(datos.visitas)) {
        totalVisitas += datos.visitas.length
        datos.visitas.forEach((v: any) => {
          if (v.resultado === 'venta_cerrada' || v.resultado === 'venta' || v.resultado === 'contacto_positivo') empresasActivas++
          if (v.resultado === 'rechazado' || v.resultado === 'sin_contacto') empresasBajas++
          
          if (detalleVisitas.length < 20) {
            detalleVisitas.push(v)
          }
        })
      }
      if (datos.pendientes && Array.isArray(datos.pendientes)) {
        datos.pendientes.forEach((p: any) => {
          if (p.completada) accionesCompletadas++
          else accionesPendientes++
        })
      }
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
      zona: session.zona || 'Varias',
      kpis,
      visitasDestacadas: detalleVisitas,
      notas: `Resumen ejecutivo generado automáticamente. Evaluados ${reportesDB.length} reportes en el periodo.`
    }

    return NextResponse.json({ reportData: monthlyReportData })
  } catch (error) {
    console.error('Error generando reporte mensual:', error)
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 })
  }
}
