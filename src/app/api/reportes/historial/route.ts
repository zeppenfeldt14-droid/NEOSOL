import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Buscar reportes en la base de datos ordenados por fecha de creación descendente
    const reportesDB = await prisma.reporteVisitas.findMany({
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
