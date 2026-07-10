import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, registrarAccion } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// ─── POST: Registrar un pago sobre una cobranza ──────────────────────────────
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    const { id } = await params
    const cobranzaId = Number(id)

    const cobranza = await prisma.cobranza.findUnique({ where: { id: cobranzaId } })
    if (!cobranza) return NextResponse.json({ error: 'Cobranza no encontrada.' }, { status: 404 })
    if (cobranza.saldoPendiente <= 0)
      return NextResponse.json({ error: 'Esta cobranza ya está saldada.' }, { status: 400 })

    // Zone access check for Level 3
    if (session.nivel === 3 && cobranza.zona !== session.zona) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
    }

    const body = await request.json()
    const { monto, metodoPago, referencia, notas } = body

    if (!monto || monto <= 0) return NextResponse.json({ error: 'Monto inválido.' }, { status: 400 })
    if (!metodoPago) return NextResponse.json({ error: 'Método de pago requerido.' }, { status: 400 })

    // Calculate financiera surcharge
    const recargoAplicado = metodoPago === 'financiera' ? monto * 0.03 : 0
    const montoFinal = monto + recargoAplicado

    // Cap at remaining balance
    const montoEfectivo = Math.min(montoFinal, cobranza.saldoPendiente)
    const nuevoSaldo = Math.max(0, cobranza.saldoPendiente - montoEfectivo)
    const nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : nuevoSaldo < cobranza.montoOriginal ? 'parcial' : 'pendiente'

    // Create payment and update balance in a transaction
    const [pago] = await prisma.$transaction([
      prisma.pago.create({
        data: {
          cobranzaId,
          monto,
          metodoPago,
          recargoAplicado,
          montoFinal: montoEfectivo,
          referencia: referencia || null,
          notas: notas || null,
          registradoPorAlias: session.alias,
        },
      }),
      prisma.cobranza.update({
        where: { id: cobranzaId },
        data: {
          saldoPendiente: nuevoSaldo,
          estado: nuevoEstado,
        },
      }),
    ])

    await registrarAccion(
      session.id, session.alias,
      'PAGO_REGISTRADO',
      `Pago ${metodoPago} de $${monto.toFixed(2)} sobre cobranza ID ${cobranzaId}. Saldo restante: $${nuevoSaldo.toFixed(2)}`
    )

    return NextResponse.json({
      success: true,
      pago,
      nuevoSaldo,
      nuevoEstado,
      recargoAplicado,
    })
  } catch (error: any) {
    console.error('[API POST Pago]', error)
    return NextResponse.json({ error: error.message || 'Error al registrar el pago.' }, { status: 500 })
  }
}
