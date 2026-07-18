import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, registrarAccion } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    const body = await request.json()
    const { cobranzaId, tipo, valor, justificativo } = body

    if (!cobranzaId || !tipo || !valor || !justificativo) {
      return NextResponse.json({ error: 'Todos los campos son requeridos.' }, { status: 400 })
    }

    const cobranza = await prisma.cobranza.findUnique({
      where: { id: Number(cobranzaId) }
    })
    if (!cobranza) {
      return NextResponse.json({ error: 'Cobranza no encontrada.' }, { status: 404 })
    }

    // Create the approval request using SolicitudEliminacion
    const solicitud = await prisma.solicitudEliminacion.create({
      data: {
        tipo, // 'VENCIMIENTO_COBRANZA' | 'PAGO_COBRANZA' | 'CUOTAS_COBRANZA'
        targetId: Number(cobranzaId),
        nombreTarget: String(valor),
        solicitadoPor: session.alias,
        motivo: justificativo,
        estado: 'pendiente'
      }
    })

    await registrarAccion(
      session.id,
      session.alias,
      `COBRANZA_SOLICITUD_${tipo}`,
      `Solicitud de ${tipo} creada para cobranza ID: ${cobranzaId}`
    )

    return NextResponse.json({ success: true, solicitud })
  } catch (error: any) {
    console.error('[API Solicitar Aprobacion Cobranza]', error)
    return NextResponse.json({ error: error.message || 'Error de servidor.' }, { status: 500 })
  }
}
