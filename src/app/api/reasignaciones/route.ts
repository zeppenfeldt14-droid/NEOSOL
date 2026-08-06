import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel >= 3) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const solicitudes = await prisma.solicitudReasignacion.findMany({
      where: { estado: 'pendiente' },
      orderBy: { creadoEn: 'desc' }
    })

    return NextResponse.json(solicitudes)
  } catch (error: any) {
    console.error('[API GET Reasignaciones]', error)
    return NextResponse.json({ error: 'Error al listar reasignaciones.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel >= 3) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const { empresaId, empresaNombre, zonaOrigen, zonaDestino, vendedorDestino } = await request.json()

    if (!empresaId || !zonaDestino || !vendedorDestino) {
      return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 })
    }

    const solicitud = await prisma.solicitudReasignacion.create({
      data: {
        empresaId,
        empresaNombre,
        solicitadoPor: session.alias,
        zonaOrigen,
        zonaDestino,
        vendedorDestino,
        estado: 'pendiente'
      }
    })

    return NextResponse.json(solicitud, { status: 201 })
  } catch (error: any) {
    console.error('[API POST Reasignaciones]', error)
    return NextResponse.json({ error: 'Error al crear solicitud.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session || session.nivel > 1) { // Only Level 1 can approve
      return NextResponse.json({ error: 'No autorizado. Solo nivel 1 puede aprobar.' }, { status: 401 })
    }

    const { id, estado } = await request.json() // 'aprobada' or 'rechazada'

    if (!id || !estado) {
      return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 })
    }

    const solicitud = await prisma.solicitudReasignacion.findUnique({ where: { id } })
    if (!solicitud) {
      return NextResponse.json({ error: 'No encontrada.' }, { status: 404 })
    }

    const updated = await prisma.solicitudReasignacion.update({
      where: { id },
      data: { estado }
    })

    // If approved, update the actual company
    if (estado === 'aprobada') {
      await prisma.empresa.update({
        where: { id: solicitud.empresaId },
        data: {
          zona: solicitud.zonaDestino,
          vendedorAsignado: solicitud.vendedorDestino,
          subZona: null // Reset subZone when changing main zone
        }
      })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('[API PUT Reasignaciones]', error)
    return NextResponse.json({ error: 'Error al procesar solicitud.' }, { status: 500 })
  }
}
