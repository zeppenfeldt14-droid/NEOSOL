import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const resolvedParams = await params
    const pedidoId = parseInt(resolvedParams.id, 10)
    if (isNaN(pedidoId)) {
      return NextResponse.json({ error: 'ID de pedido inválido' }, { status: 400 })
    }

    const data = await req.json()
    const { estado } = data

    if (!estado) {
      return NextResponse.json({ error: 'Estado requerido' }, { status: 400 })
    }

    // Actualizar el pedido
    const pedidoActualizado = await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        estado,
        ...(estado === 'aprobado' ? {
          aprobadoPorId: user.id,
          aprobadoPorAlias: user.alias,
          aprobadoEn: new Date()
        } : {})
      }
    })

    // Registrar en bitácora
    await prisma.logBitacora.create({
      data: {
        usuarioId: user.id,
        usuarioAlias: user.alias,
        tipoAccion: 'CAMBIO_ESTADO_PEDIDO',
        detalles: `Cambió pedido ID: ${pedidoId} a estado: ${estado}`
      }
    })

    return NextResponse.json({ success: true, pedido: pedidoActualizado })
  } catch (error: any) {
    console.error('Cambio de estado Pedido Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
