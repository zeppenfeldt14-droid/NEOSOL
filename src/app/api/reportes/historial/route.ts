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

    // Buscar reportes ordenados por fecha descendente
    const reportesDB = await prisma.reporteVisitas.findMany({
      where: whereClause,
      orderBy: { creadoEn: 'desc' }
    })

    // Filtro de tiempo por el campo 'fecha' (DD-MM-YYYY) del reporte.
    // Esto asegura que reportes históricos aparezcan en el mes real de su fecha,
    // no en el mes que fueron insertados en la BD.
    let reportesFiltrados = reportesDB
    if (period !== null && period !== undefined && period !== '') {
      reportesFiltrados = reportesDB.filter(r => {
        const partes = r.fecha.split('-') // DD-MM-YYYY
        if (partes.length < 3) return false
        
        if (period.startsWith('Q')) {
          const q = parseInt(period.replace('Q', ''))
          const mesReporte = parseInt(partes[1]) - 1 // 0-indexed
          const anoReporte = parseInt(partes[2])
          const anoActual = new Date().getFullYear()
          const mesInicio = (q - 1) * 3
          const mesFin = q * 3 - 1
          return anoReporte === anoActual && mesReporte >= mesInicio && mesReporte <= mesFin
        } else {
          const mesSeleccionado = parseInt(period) // 0-indexed (JS getMonth())
          const mesReporte = parseInt(partes[1]) - 1 // convertir DD-MM-YYYY mes a 0-indexed
          const anoReporte = parseInt(partes[2])
          const anoActual = new Date().getFullYear()
          return anoReporte === anoActual && mesReporte === mesSeleccionado
        }
      })
    }

    const reportes = reportesFiltrados.map(r => {
      let parsedData = {}
      try {
        parsedData = JSON.parse(r.datosJSON)
      } catch (e) {
        console.error('Error al parsear datosJSON del reporte ID:', r.id, e)
      }

      return {
        id: r.id,
        filename: `${r.fecha}.pdf`,
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
