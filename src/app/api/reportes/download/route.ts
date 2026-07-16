import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filename = searchParams.get('file')

    if (!filename) {
      return NextResponse.json({ error: 'Parámetro de archivo requerido' }, { status: 400 })
    }

    // Extraer la fecha del filename (por ejemplo, '16-07-2026.pdf' -> '16-07-2026')
    const fecha = filename.replace(/\.pdf$/, '').replace(/\.png$/, '')

    const reporte = await prisma.reporteVisitas.findFirst({
      where: { fecha }
    })

    if (!reporte) {
      return NextResponse.json({ error: 'Reporte no encontrado en base de datos' }, { status: 404 })
    }

    const datos = JSON.parse(reporte.datosJSON)
    return NextResponse.json(datos)
  } catch (error) {
    console.error('Error al descargar datos del reporte:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
