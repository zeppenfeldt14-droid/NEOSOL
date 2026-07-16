import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')

    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    let whereClause: any = {}
    
    // RBAC: Nivel 1 (Gerencia) ve todo. Nivel 2 (Supervisor) ve sus zonas habilitadas. Nivel 3 (Vendedor) ve su zona.
    if (session.nivel === 2) {
      let zonas: string[] = []
      if (Array.isArray(session.zonasHabilitadas)) {
        zonas = [...session.zonasHabilitadas]
      }
      if (session.zona && !zonas.includes(session.zona)) {
        zonas.push(session.zona)
      }
      whereClause.zona = { in: zonas }
    } else if (session.nivel >= 3) {
      whereClause.zona = session.zona || ''
    }

    // Filtro de tiempo
    if (period !== null && period !== undefined) {
      const year = new Date().getFullYear()
      let startDate, endDate
      
      if (period.startsWith('Q')) {
        // Trimestres
        const q = parseInt(period.replace('Q', ''))
        startDate = new Date(year, (q - 1) * 3, 1)
        endDate = new Date(year, q * 3, 0, 23, 59, 59)
      } else {
        // Meses
        const month = parseInt(period)
        startDate = new Date(year, month, 1)
        endDate = new Date(year, month + 1, 0, 23, 59, 59)
      }
      
      whereClause.creadoEn = {
        gte: startDate,
        lte: endDate
      }
    }

    // Buscar reportes ordenados por fecha de creación descendente
    const reportesDB = await prisma.reporteVisitas.findMany({
      where: whereClause,
      orderBy: {
        creadoEn: 'desc'
      }
    })

    const reportes = reportesDB.map(r => {
      let parsedData = {}
      try {
        parsedData = JSON.parse(r.datosJSON)
      } catch (e) {
        console.error('Error al parsear datosJSON del reporte ID:', r.id, e)
      }

      return {
        id: r.id,
        filename: `${r.fecha}.pdf`, // Se mantiene filename para compatibilidad con la interfaz
        fecha: r.fecha,
        zona: r.zona,
        vendedorAlias: r.vendedorAlias,
        datosJSON: parsedData,
        date: r.creadoEn.toISOString(),
        isImage: false,
        size: 0
      }
    })

    return NextResponse.json({ reportes })
  } catch (error) {
    console.error('Error listing reports from database:', error)
    return NextResponse.json({ error: 'Error al listar reportes' }, { status: 500 })
  }
}
