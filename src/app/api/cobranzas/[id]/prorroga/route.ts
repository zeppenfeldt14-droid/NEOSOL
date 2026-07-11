import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { id } = params
    const body = await req.json()
    const { fechaVencimiento } = body

    if (!fechaVencimiento) {
      return NextResponse.json({ error: 'Falta nueva fecha de vencimiento' }, { status: 400 })
    }

    const cobranza = await prisma.cobranza.findUnique({
      where: { id: parseInt(id) }
    })

    if (!cobranza) {
      return NextResponse.json({ error: 'Cobranza no encontrada' }, { status: 404 })
    }

    // Recalcular estado y días de atraso basados en la nueva prórroga
    const nuevaFecha = new Date(fechaVencimiento)
    let estado = cobranza.estado
    let diasAtraso = null

    if (cobranza.saldoPendiente > 0) {
      // Si la nueva fecha sigue siendo en el pasado respecto a hoy
      if (nuevaFecha < new Date()) {
        estado = 'vencida'
        const diffTime = Math.abs(new Date().getTime() - nuevaFecha.getTime())
        diasAtraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      } else {
        // La deuda está en el futuro, por ende es pendiente o parcial
        estado = cobranza.saldoPendiente < cobranza.montoOriginal ? 'parcial' : 'pendiente'
      }
    } else {
      estado = 'pagada'
    }

    const actualizada = await prisma.cobranza.update({
      where: { id: parseInt(id) },
      data: {
        fechaVencimiento: nuevaFecha.toISOString(),
        estado
      }
    })

    return NextResponse.json(actualizada)
  } catch (error: any) {
    console.error('Error Prorroga:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
