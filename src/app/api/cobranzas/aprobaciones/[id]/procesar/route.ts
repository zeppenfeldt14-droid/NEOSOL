import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, registrarAccion } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await getSessionUser()
    if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    if (session.nivel > 2) return NextResponse.json({ error: 'Sin permisos para procesar aprobaciones.' }, { status: 403 })

    const { id } = await params
    const solicitudId = Number(id)

    const solicitud = await prisma.solicitudEliminacion.findUnique({
      where: { id: solicitudId }
    })
    if (!solicitud) return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 })
    if (solicitud.estado !== 'pendiente') {
      return NextResponse.json({ error: 'Esta solicitud ya fue procesada.' }, { status: 400 })
    }

    const body = await request.json()
    const { decision } = body // 'aprobar' | 'rechazar'

    if (decision !== 'aprobar' && decision !== 'rechazar') {
      return NextResponse.json({ error: 'Decisión inválida.' }, { status: 400 })
    }

    const cobranzaId = solicitud.targetId

    if (decision === 'rechazar') {
      await prisma.solicitudEliminacion.update({
        where: { id: solicitudId },
        data: { estado: 'rechazado' }
      })
      await registrarAccion(
        session.id, session.alias,
        'COBRANZA_SOLICITUD_RECHAZADA',
        `Rechazada solicitud ${solicitud.tipo} (ID: ${solicitudId}) para cobranza ID: ${cobranzaId}`
      )
      return NextResponse.json({ success: true, estado: 'rechazado' })
    }

    // Si es APROBAR, procesamos según el tipo de solicitud:
    const cobranza = await prisma.cobranza.findUnique({ where: { id: cobranzaId } })
    if (!cobranza) return NextResponse.json({ error: 'La cobranza asociada ya no existe.' }, { status: 404 })

    if (solicitud.tipo === 'VENCIMIENTO_COBRANZA') {
      const nuevaFecha = new Date(solicitud.nombreTarget)
      
      // Recalcular estado
      let estado = cobranza.estado
      let diasAtraso = null
      if (cobranza.saldoPendiente > 0) {
        if (nuevaFecha < new Date()) {
          estado = 'vencida'
          const diffTime = Math.abs(new Date().getTime() - nuevaFecha.getTime())
          diasAtraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        } else {
          estado = cobranza.saldoPendiente < cobranza.montoOriginal ? 'parcial' : 'pendiente'
        }
      } else {
        estado = 'pagada'
      }

      await prisma.$transaction([
        prisma.cobranza.update({
          where: { id: cobranzaId },
          data: {
            fechaVencimiento: nuevaFecha,
            estado
          }
        }),
        prisma.solicitudEliminacion.update({
          where: { id: solicitudId },
          data: { estado: 'aprobado' }
        })
      ])

    } else if (solicitud.tipo === 'PAGO_COBRANZA') {
      const pagoData = JSON.parse(solicitud.nombreTarget)
      const { monto, metodoPago, referencia, notas } = pagoData

      if (cobranza.saldoPendiente <= 0) {
        return NextResponse.json({ error: 'La cobranza ya está saldada.' }, { status: 400 })
      }

      const recargoAplicado = metodoPago === 'financiera' ? monto * 0.03 : 0
      const montoFinal = monto + recargoAplicado
      const montoEfectivo = Math.min(montoFinal, cobranza.saldoPendiente)
      const nuevoSaldo = Math.max(0, cobranza.saldoPendiente - montoEfectivo)
      const nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : nuevoSaldo < cobranza.montoOriginal ? 'parcial' : 'pendiente'

      await prisma.$transaction([
        prisma.pago.create({
          data: {
            cobranzaId,
            monto,
            metodoPago,
            recargoAplicado,
            montoFinal: montoEfectivo,
            referencia: referencia || null,
            notas: notas || null,
            registradoPorAlias: solicitud.solicitadoPor
          }
        }),
        prisma.cobranza.update({
          where: { id: cobranzaId },
          data: {
            saldoPendiente: nuevoSaldo,
            estado: nuevoEstado
          }
        }),
        prisma.solicitudEliminacion.update({
          where: { id: solicitudId },
          data: { estado: 'aprobado' }
        })
      ])

    } else if (solicitud.tipo === 'CUOTAS_COBRANZA') {
      const cantCuotas = Number(solicitud.nombreTarget)
      if (isNaN(cantCuotas) || cantCuotas < 2) {
        return NextResponse.json({ error: 'Cantidad de cuotas inválida para fraccionar.' }, { status: 400 })
      }

      const montoPorCuota = Math.round((cobranza.montoOriginal / cantCuotas) * 100) / 100
      const saldoPorCuota = Math.round((cobranza.saldoPendiente / cantCuotas) * 100) / 100

      // Crear las nuevas sub-cuotas
      const baseVencimiento = cobranza.fechaVencimiento ? new Date(cobranza.fechaVencimiento) : new Date()

      for (let i = 1; i <= cantCuotas; i++) {
        const vencimientoCuota = new Date(baseVencimiento)
        vencimientoCuota.setDate(vencimientoCuota.getDate() + (i - 1) * 30)

        // Calcular estado para la subcuota
        let subEstado = 'pendiente'
        if (saldoPorCuota > 0 && vencimientoCuota < new Date()) {
          subEstado = 'vencida'
        }

        await prisma.cobranza.create({
          data: {
            pedidoId: cobranza.pedidoId,
            empresaId: cobranza.empresaId,
            empresaNombre: cobranza.empresaNombre,
            vendedorAlias: cobranza.vendedorAlias,
            zona: cobranza.zona,
            montoOriginal: montoPorCuota,
            saldoPendiente: saldoPorCuota,
            cuota: i,
            totalCuotas: cantCuotas,
            estado: subEstado,
            fechaVencimiento: vencimientoCuota,
            tipoFactura: cobranza.tipoFactura,
            metodoPago: cobranza.metodoPago
          }
        })
      }

      // Eliminar o marcar como procesada/pagada la cobranza original
      await prisma.$transaction([
        prisma.cobranza.delete({
          where: { id: cobranzaId }
        }),
        prisma.solicitudEliminacion.update({
          where: { id: solicitudId },
          data: { estado: 'aprobado' }
        })
      ])
    } else {
      return NextResponse.json({ error: 'Tipo de solicitud no soportado.' }, { status: 400 })
    }

    await registrarAccion(
      session.id, session.alias,
      'COBRANZA_SOLICITUD_APROBADA',
      `Aprobada solicitud ${solicitud.tipo} (ID: ${solicitudId}) para cobranza ID: ${cobranzaId}`
    )

    return NextResponse.json({ success: true, estado: 'aprobado' })
  } catch (error: any) {
    console.error('[API Procesar Aprobacion Cobranza]', error)
    return NextResponse.json({ error: error.message || 'Error de servidor.' }, { status: 500 })
  }
}
