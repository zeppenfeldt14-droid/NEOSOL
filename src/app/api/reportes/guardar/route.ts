import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { fecha, zona, vendedorAlias, datosJSON } = body

    if (!fecha || !zona || !vendedorAlias || !datosJSON) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios' }, { status: 400 })
    }

    const reportData = typeof datosJSON === 'string' ? datosJSON : JSON.stringify(datosJSON)

    // Crear o actualizar (upsert) el reporte estructurado en base de datos
    const reporte = await prisma.reporteVisitas.upsert({
      where: {
        fecha_zona: {
          fecha,
          zona
        }
      },
      update: {
        vendedorAlias,
        datosJSON: reportData
      },
      create: {
        fecha,
        zona,
        vendedorAlias,
        datosJSON: reportData
      }
    })

    return NextResponse.json({ success: true, id: reporte.id })
  } catch (error: any) {
    console.error('Error al guardar reporte:', error)
    return NextResponse.json({ error: 'Error interno del servidor', detalles: error.message }, { status: 500 })
  }
}
